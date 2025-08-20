import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { triageLimiter } from '../middlewares/rateLimiting.js';
import {
  runTriage,
  getAgentSuggestion,
  getPendingSuggestions,
  sendAgentReply,
  regenerateSuggestion
} from '../services/agent.js';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { TriageSchema, MongoIdParam, AgentReplySchema, RegenerateSuggestionSchema } from '../schemas/validation.js';
import { randomUUID } from 'crypto';

const router = Router();

// Existing triage endpoint
router.post('/triage', requireAuth, requireRole('admin','agent'), triageLimiter, validate(TriageSchema), async (req, res) => {
  const { ticketId, traceId } = req.valid.body;
  const suggestion = await runTriage({ ticketId, traceId: traceId || randomUUID() });
  res.json({ ok:true, data: suggestion });
});

// Get pending suggestions for agent review
router.get('/suggestions', requireAuth, requireRole('admin','agent'), async (req, res) => {
  const filters = {};
  if (req.query.category) filters.category = req.query.category;
  if (req.query.minConfidence) filters.minConfidence = parseFloat(req.query.minConfidence);
  if (req.query.maxAge) filters.maxAge = parseInt(req.query.maxAge);

  const suggestions = await getPendingSuggestions(filters);
  res.json({ ok: true, data: suggestions });
});

// Get specific suggestion details
router.get('/suggestions/:id', requireAuth, requireRole('admin','agent'), validate(MongoIdParam), async (req, res) => {
  const suggestion = await getAgentSuggestion(req.valid.params.id);
  res.json({ ok: true, data: suggestion });
});

// Send agent reply based on suggestion
router.post('/suggestions/:id/reply', requireAuth, requireRole('admin','agent'), validate(AgentReplySchema), async (req, res) => {
  const { customReply, resolveTicket = true } = req.valid.body;
  const traceId = randomUUID();

  const result = await sendAgentReply({
    suggestionId: req.params.id,
    agentId: req.user.sub,
    customReply,
    traceId,
    resolveTicket
  });

  res.json({ ok: true, data: result });
});

// Regenerate suggestion with different template
router.post('/suggestions/:id/regenerate', requireAuth, requireRole('admin','agent'), validate(RegenerateSuggestionSchema), async (req, res) => {
  const { template = 'default' } = req.valid.body;
  const traceId = randomUUID();

  const suggestion = await getAgentSuggestion(req.params.id);
  const ticketId = suggestion.ticketId._id || suggestion.ticketId;

  const newSuggestion = await regenerateSuggestion({
    ticketId,
    traceId,
    template
  });

  res.json({ ok: true, data: newSuggestion });
});

// Get suggestion by ticket ID (legacy endpoint)
router.get('/suggestion/:ticketId', requireAuth, async (req, res) => {
  const suggestion = await AgentSuggestion.findOne({ ticketId: req.params.ticketId })
    .populate('articleIds', 'title body tags')
    .lean();

  if (!suggestion) {
    return res.status(404).json({ ok: false, error: { message: 'No suggestion found for this ticket' } });
  }

  res.json({ ok: true, data: suggestion });
});

export default router;