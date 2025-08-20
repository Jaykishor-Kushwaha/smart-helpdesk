import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Article } from '../src/models/Article.js';
import { AgentSuggestion } from '../src/models/AgentSuggestion.js';
import { Reply } from '../src/models/Reply.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { signJwt } from '../src/lib/jwt.js';
import { mockUsers, mockTickets, mockArticles } from './fixtures.js';
import './setup.js';

const app = createApp();

describe('Enhanced Agent Workflow', () => {
  let adminToken, agentToken, userToken;
  let adminUser, agentUser, regularUser;
  let testTicket, testSuggestion;

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create({ ...mockUsers.admin, password_hash: 'hashed_password_123' });
    agentUser = await User.create({ ...mockUsers.agent, password_hash: 'hashed_password_123' });
    regularUser = await User.create({ ...mockUsers.user, password_hash: 'hashed_password_123' });

    // Generate tokens
    adminToken = signJwt({ sub: adminUser._id, email: adminUser.email, role: adminUser.role });
    agentToken = signJwt({ sub: agentUser._id, email: agentUser.email, role: agentUser.role });
    userToken = signJwt({ sub: regularUser._id, email: regularUser.email, role: regularUser.role });

    // Create test articles
    await Article.create(mockArticles[0]);
    await Article.create(mockArticles[1]);

    // Create test ticket
    testTicket = await Ticket.create({
      ...mockTickets[0],
      createdBy: regularUser._id
    });

    // Create test suggestion
    testSuggestion = await AgentSuggestion.create({
      ticketId: testTicket._id,
      predictedCategory: 'billing',
      articleIds: [],
      draftReply: 'Thank you for contacting us about your billing inquiry. We will review your request and get back to you shortly.',
      confidence: 0.85,
      autoClosed: false,
      modelInfo: {
        provider: 'test',
        model: 'test-model',
        promptVersion: 'v1',
        latencyMs: 100
      }
    });
  });

  describe('GET /api/agent/suggestions', () => {
    test('should return pending suggestions for agents', async () => {
      const res = await request(app)
        .get('/api/agent/suggestions')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('should filter suggestions by category', async () => {
      const res = await request(app)
        .get('/api/agent/suggestions?category=billing')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should filter suggestions by confidence', async () => {
      const res = await request(app)
        .get('/api/agent/suggestions?minConfidence=0.8')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should deny access to regular users', async () => {
      await request(app)
        .get('/api/agent/suggestions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/agent/suggestions/:id', () => {
    test('should return specific suggestion details', async () => {
      const res = await request(app)
        .get(`/api/agent/suggestions/${testSuggestion._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data._id).toBe(testSuggestion._id.toString());
      expect(res.body.data.draftReply).toBe(testSuggestion.draftReply);
      expect(res.body.data.confidence).toBe(testSuggestion.confidence);
    });

    test('should return 404 for non-existent suggestion', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/agent/suggestions/${fakeId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(404);
    });
  });

  describe('POST /api/agent/suggestions/:id/reply', () => {
    test('should send agent reply with default settings', async () => {
      const res = await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/reply`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.ticket).toBeDefined();
      expect(res.body.data.suggestion).toBeDefined();

      // Check that reply was created
      const reply = await Reply.findOne({ ticketId: testTicket._id });
      expect(reply).toBeTruthy();
      expect(reply.authorType).toBe('agent');
      expect(reply.author.toString()).toBe(agentUser._id.toString());

      // Check that ticket was resolved
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.status).toBe('resolved');
    });

    test('should send custom reply', async () => {
      const customReply = 'This is a custom reply from the agent.';
      
      const res = await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/reply`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          customReply,
          resolveTicket: false
        })
        .expect(200);

      expect(res.body.ok).toBe(true);

      // Check that custom reply was used
      const reply = await Reply.findOne({ ticketId: testTicket._id });
      expect(reply.body).toBe(customReply);

      // Check that ticket was not resolved
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.status).toBe('waiting_human');
    });

    test('should create audit logs', async () => {
      await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/reply`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(200);

      const auditLogs = await AuditLog.find({ ticketId: testTicket._id });
      const replyLog = auditLogs.find(log => log.action === 'AGENT_REPLY_SENT');
      const resolveLog = auditLogs.find(log => log.action === 'TICKET_RESOLVED');

      expect(replyLog).toBeTruthy();
      expect(replyLog.actor).toBe('agent');
      expect(resolveLog).toBeTruthy();
    });
  });

  describe('POST /api/agent/suggestions/:id/regenerate', () => {
    test('should regenerate suggestion with default template', async () => {
      const res = await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/regenerate`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data._id).toBe(testSuggestion._id.toString());
      expect(res.body.data.draftReply).toBeDefined();
    });

    test('should regenerate suggestion with detailed template', async () => {
      const res = await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/regenerate`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ template: 'detailed' })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data.modelInfo.promptVersion).toBe('v1-detailed');
    });

    test('should create audit log for regeneration', async () => {
      await request(app)
        .post(`/api/agent/suggestions/${testSuggestion._id}/regenerate`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({})
        .expect(200);

      const auditLogs = await AuditLog.find({ ticketId: testTicket._id });
      const regenLog = auditLogs.find(log => log.action === 'SUGGESTION_REGENERATED');
      const updateLog = auditLogs.find(log => log.action === 'SUGGESTION_UPDATED');

      expect(regenLog).toBeTruthy();
      expect(updateLog).toBeTruthy();
    });
  });

  describe('Enhanced Reply Templates', () => {
    test('should generate different replies for different categories', async () => {
      // Create tickets with different categories
      const techTicket = await Ticket.create({
        title: 'App crashes on login',
        description: 'Getting error 500 when trying to log in',
        category: 'tech',
        createdBy: regularUser._id
      });

      const shippingTicket = await Ticket.create({
        title: 'Package not delivered',
        description: 'My package was supposed to arrive yesterday',
        category: 'shipping',
        createdBy: regularUser._id
      });

      // Run triage on both tickets
      const techRes = await request(app)
        .post('/api/agent/triage')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ticketId: techTicket._id })
        .expect(200);

      const shippingRes = await request(app)
        .post('/api/agent/triage')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ticketId: shippingTicket._id })
        .expect(200);

      // Check that replies are different and category-appropriate
      expect(techRes.body.data.draftReply).toContain('technical');
      expect(shippingRes.body.data.draftReply).toContain('shipping');
      expect(techRes.body.data.draftReply).not.toBe(shippingRes.body.data.draftReply);
    });
  });

  describe('Integration with Existing Workflow', () => {
    test('should work with existing triage endpoint', async () => {
      const newTicket = await Ticket.create({
        title: 'Billing question about refund',
        description: 'I need a refund for my last order',
        category: 'other',
        createdBy: regularUser._id
      });

      const res = await request(app)
        .post('/api/agent/triage')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ ticketId: newTicket._id })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data.draftReply).toBeDefined();
      expect(res.body.data.confidence).toBeDefined();

      // Should be able to get the suggestion through new endpoint
      const suggestionRes = await request(app)
        .get(`/api/agent/suggestions/${res.body.data._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(suggestionRes.body.data._id).toBe(res.body.data._id);
    });
  });
});
