
import { Article } from '../models/Article.js';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { Ticket } from '../models/Ticket.js';
import { AuditLog } from '../models/AuditLog.js';
import { Reply } from '../models/Reply.js';
import { config } from '../config.js';
import { withRetry, retryConfigs } from '../lib/retry.js';

const KEYWORDS = {
  billing: ['refund','invoice','payment','charged','credit','billing'],
  tech: ['error','bug','stack','crash','500','login','auth','issue'],
  shipping: ['delivery','shipment','tracking','package','courier','delayed']
};

function classifyHeuristic(text) {
  const counts = { billing:0, tech:0, shipping:0 };
  const lower = text.toLowerCase();
  for (const k of KEYWORDS.billing) if (lower.includes(k)) counts.billing++;
  for (const k of KEYWORDS.tech) if (lower.includes(k)) counts.tech++;
  for (const k of KEYWORDS.shipping) if (lower.includes(k)) counts.shipping++;
  let predicted = 'other';
  let max = 0;
  for (const [k,v] of Object.entries(counts)) { if (v>max) { max=v; predicted=k; } }
  const confidence = Math.min(1, 0.5 + (max*0.15));
  return { predictedCategory: predicted, confidence: predicted==='other'?0.5:confidence };
}

async function retrieveKB(query) {
  return await withRetry(
    async () => {
      const results = await Article.find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(3)
        .lean();
      return results;
    },
    { ...retryConfigs.database, operationName: 'retrieve KB articles' }
  );
}

function draftReply(ticket, articles, options = {}) {
  const { template = 'default', personalize = true } = options;
  
  // Get template based on category and confidence
  const replyTemplate = getReplyTemplate(ticket.category, template);
  
  // Prepare article references
  const articleRefs = articles.map((a, i) => ({
    number: i + 1,
    title: a.title,
    summary: a.body.substring(0, 150) + (a.body.length > 150 ? '...' : ''),
    tags: a.tags || []
  }));
  
  // Generate personalized greeting if enabled
  const greeting = personalize ? getPersonalizedGreeting() : 'Hello,';
  
  // Build the reply using template
  const reply = buildReplyFromTemplate(replyTemplate, {
    greeting,
    ticketTitle: ticket.title,
    ticketCategory: ticket.category,
    articles: articleRefs,
    hasArticles: articles.length > 0
  });

  return {
    draftReply: reply,
    citations: articles.map(a => String(a._id)),
    template: template,
    articleCount: articles.length
  };
}

function getReplyTemplate(category, templateType = 'default') {
  const templates = {
    billing: {
      default: `{greeting}

Thank you for contacting us about your billing inquiry: "{ticketTitle}".

{articleSection}

{closingSection}`,
      urgent: `{greeting}

We understand billing issues can be concerning. We've reviewed your ticket: "{ticketTitle}".

{articleSection}

For immediate assistance, you can also call our billing support line.

{closingSection}`
    },
    tech: {
      default: `{greeting}

Thank you for reporting the technical issue: "{ticketTitle}".

{articleSection}

{closingSection}`,
      detailed: `{greeting}

We've received your technical support request: "{ticketTitle}".

{articleSection}

If these resources don't resolve the issue, please provide additional details such as:
- Steps to reproduce the problem
- Error messages (if any)
- Your browser/device information

{closingSection}`
    },
    shipping: {
      default: `{greeting}

Thank you for your shipping inquiry: "{ticketTitle}".

{articleSection}

{closingSection}`
    },
    other: {
      default: `{greeting}

Thank you for contacting us regarding: "{ticketTitle}".

{articleSection}

{closingSection}`
    }
  };

  return templates[category]?.[templateType] || templates.other.default;
}

function getPersonalizedGreeting() {
  const timeOfDay = new Date().getHours();
  let timeGreeting = '';

  if (timeOfDay < 12) timeGreeting = 'Good morning';
  else if (timeOfDay < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  return `${timeGreeting},`;
}

function buildReplyFromTemplate(template, data) {
  let reply = template;

  // Replace basic placeholders
  reply = reply.replace('{greeting}', data.greeting);
  reply = reply.replace('{ticketTitle}', data.ticketTitle);
  reply = reply.replace('{ticketCategory}', data.ticketCategory);

  // Build article section
  let articleSection = '';
  if (data.hasArticles) {
    articleSection = `Based on our knowledge base, here are some resources that may help:

${data.articles.map(a => `${a.number}. **${a.title}**
   ${a.summary}`).join('\n\n')}`;
  } else {
    articleSection = `We're reviewing your request and will route it to the appropriate specialist for personalized assistance.`;
  }

  reply = reply.replace('{articleSection}', articleSection);

  // Build closing section
  const closingSection = data.hasArticles
    ? `If these resources resolve your issue, you can mark this ticket as resolved. Otherwise, our support team will follow up with you shortly.

Best regards,
Smart Helpdesk Support Team`
    : `Our support team will review your request and get back to you within 24 hours.

Best regards,
Smart Helpdesk Support Team`;

  reply = reply.replace('{closingSection}', closingSection);

  return reply;
}

async function appendAudit(ticketId, traceId, actor, action, meta={}) {
  await AuditLog.create({ ticketId, traceId, actor, action, meta, timestamp: new Date() });
}

// New functions for enhanced agent workflow

export async function getAgentSuggestion(suggestionId) {
  return await withRetry(
    async () => {
      const suggestion = await AgentSuggestion.findById(suggestionId)
        .populate('ticketId', 'title description category status createdBy')
        .populate('articleIds', 'title body tags')
        .lean();

      if (!suggestion) {
        throw Object.assign(new Error('Agent suggestion not found'), { status: 404 });
      }

      return suggestion;
    },
    { ...retryConfigs.database, operationName: 'get agent suggestion' }
  );
}

export async function getPendingSuggestions(filters = {}) {
  return await withRetry(
    async () => {
      const query = { autoClosed: false };

      // Add filters
      if (filters.category) query['ticketId.category'] = filters.category;
      if (filters.minConfidence) query.confidence = { $gte: filters.minConfidence };
      if (filters.maxAge) {
        const cutoff = new Date(Date.now() - filters.maxAge * 60 * 60 * 1000);
        query.createdAt = { $gte: cutoff };
      }

      const suggestions = await AgentSuggestion.find(query)
        .populate('ticketId', 'title description category status createdBy createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return suggestions;
    },
    { ...retryConfigs.database, operationName: 'get pending suggestions' }
  );
}

export async function sendAgentReply({ suggestionId, agentId, customReply, traceId, resolveTicket = true }) {
  return await withRetry(
    async () => {
      const suggestion = await AgentSuggestion.findById(suggestionId);
      if (!suggestion) {
        throw Object.assign(new Error('Agent suggestion not found'), { status: 404 });
      }

      const ticket = await Ticket.findById(suggestion.ticketId);
      if (!ticket) {
        throw Object.assign(new Error('Ticket not found'), { status: 404 });
      }

      // Use custom reply if provided, otherwise use the suggested reply
      const replyBody = customReply || suggestion.draftReply;

      // Create the reply
      const reply = await Reply.create({
        ticketId: ticket._id,
        author: agentId,
        authorType: 'agent',
        body: replyBody,
        isAutoGenerated: false,
        agentSuggestionId: suggestion._id
      });

      // Update ticket status
      if (resolveTicket) {
        ticket.status = 'resolved';
      } else {
        ticket.status = 'waiting_human';
      }
      await ticket.save();

      // Log audit events
      await appendAudit(ticket._id, traceId, 'agent', 'AGENT_REPLY_SENT', {
        replyId: reply._id,
        suggestionId: suggestion._id,
        customReply: !!customReply,
        resolved: resolveTicket
      });

      if (resolveTicket) {
        await appendAudit(ticket._id, traceId, 'agent', 'TICKET_RESOLVED', {
          resolvedBy: agentId,
          suggestionId: suggestion._id
        });
      }

      return { reply, ticket, suggestion };
    },
    { ...retryConfigs.database, operationName: 'send agent reply' }
  );
}

export async function regenerateSuggestion({ ticketId, traceId, template = 'default' }) {
  return await withRetry(
    async () => {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw Object.assign(new Error('Ticket not found'), { status: 404 });
      }

      await appendAudit(ticketId, traceId, 'agent', 'SUGGESTION_REGENERATED');

      // Re-run classification and KB retrieval
      const { predictedCategory, confidence } = classifyHeuristic(`${ticket.title} ${ticket.description||''}`);
      const kb = await retrieveKB(`${ticket.title} ${ticket.description||''}`);

      // Generate new reply with specified template
      const draft = draftReply(ticket, kb, { template });

      // Update existing suggestion or create new one
      let suggestion = await AgentSuggestion.findOne({ ticketId: ticket._id });
      if (suggestion) {
        suggestion.predictedCategory = predictedCategory;
        suggestion.articleIds = kb.map(k => k._id);
        suggestion.draftReply = draft.draftReply;
        suggestion.confidence = confidence;
        suggestion.modelInfo.promptVersion = `v1-${template}`;
        await suggestion.save();
      } else {
        suggestion = await AgentSuggestion.create({
          ticketId: ticket._id,
          predictedCategory,
          articleIds: kb.map(k => k._id),
          draftReply: draft.draftReply,
          confidence,
          autoClosed: false,
          modelInfo: {
            provider: config.stubMode ? 'stub' : 'llm',
            model: config.stubMode ? 'heuristic' : 'unknown',
            promptVersion: `v1-${template}`,
            latencyMs: 0
          }
        });
      }

      await appendAudit(ticketId, traceId, 'agent', 'SUGGESTION_UPDATED', {
        suggestionId: suggestion._id,
        template,
        confidence
      });

      return suggestion;
    },
    { ...retryConfigs.database, operationName: 'regenerate suggestion' }
  );
}

export async function runTriage({ ticketId, traceId }) {
  return await withRetry(
    async () => {
      const started = Date.now();
      const t = await Ticket.findById(ticketId);
      if (!t) throw Object.assign(new Error('Ticket not found'), { status:404 });

      await appendAudit(ticketId, traceId, 'system', 'TRIAGE_STARTED');

  const { predictedCategory, confidence } = classifyHeuristic(`${t.title} ${t.description||''}`);
  await appendAudit(ticketId, traceId, 'system', 'AGENT_CLASSIFIED', { predictedCategory, confidence });

  const kb = await retrieveKB(`${t.title} ${t.description||''}`);
  await appendAudit(ticketId, traceId, 'system', 'KB_RETRIEVED', { articleIds: kb.map(k=>k._id) });

  const draft = draftReply(t, kb);
  await appendAudit(ticketId, traceId, 'system', 'DRAFT_GENERATED', { citations: draft.citations });

  const auto = config.autoCloseEnabled && confidence >= config.confidenceThreshold;

  const suggestion = await AgentSuggestion.create({
    ticketId: t._id,
    predictedCategory,
    articleIds: kb.map(k=>k._id),
    draftReply: draft.draftReply,
    confidence,
    autoClosed: !!auto,
    modelInfo: { provider: config.stubMode ? 'stub' : 'llm', model: config.stubMode ? 'heuristic' : 'unknown', promptVersion: 'v1', latencyMs: Date.now()-started }
  });

  t.category = predictedCategory;
  t.agentSuggestionId = suggestion._id;
  if (auto) {
    t.status = 'resolved';

    // Create auto-reply message
    await Reply.create({
      ticketId: t._id,
      author: null,
      authorType: 'system',
      body: draft.draftReply,
      isAutoGenerated: true,
      agentSuggestionId: suggestion._id
    });

    await appendAudit(ticketId, traceId, 'system', 'AUTO_CLOSED', { confidence, threshold: config.confidenceThreshold });
    await appendAudit(ticketId, traceId, 'system', 'AUTO_REPLY_SENT', { replyBody: draft.draftReply });
  } else {
    t.status = 'waiting_human';
    await appendAudit(ticketId, traceId, 'system', 'ASSIGNED_TO_HUMAN');
  }
  await t.save();

      await appendAudit(ticketId, traceId, 'system', 'TRIAGE_COMPLETED');
      return suggestion;
    },
    { ...retryConfigs.triage, operationName: 'ticket triage' }
  );
}



