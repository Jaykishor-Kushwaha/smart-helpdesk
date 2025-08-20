import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Article } from '../src/models/Article.js';
import { AgentSuggestion } from '../src/models/AgentSuggestion.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { signJwt } from '../src/lib/jwt.js';
import { mockUsers, mockTickets, mockArticles } from './fixtures.js';
import './setup.js';

const app = createApp();

describe('Agent Triage', () => {
  let agentToken;
  let userToken;
  let userId;
  let ticketId;

  beforeEach(async () => {
    // Create users
    const user = await User.create({
      ...mockUsers.user,
      password_hash: 'hashedpassword'
    });
    userId = user._id;
    userToken = signJwt({ 
      sub: String(user._id), 
      email: user.email, 
      role: user.role, 
      name: user.name 
    });

    const agent = await User.create({
      ...mockUsers.agent,
      password_hash: 'hashedpassword'
    });
    agentToken = signJwt({ 
      sub: String(agent._id), 
      email: agent.email, 
      role: agent.role, 
      name: agent.name 
    });

    // Create KB articles
    await Article.insertMany(mockArticles);

    // Create a test ticket
    const ticket = await Ticket.create({
      ...mockTickets[0], // billing ticket
      createdBy: userId
    });
    ticketId = ticket._id;
  });

  test('should run triage and create agent suggestion', async () => {
    const response = await request(app)
      .post('/api/agent/triage')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ 
        ticketId: String(ticketId),
        traceId: 'test-trace-123'
      })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeTruthy();

    // Verify AgentSuggestion was created
    const suggestion = await AgentSuggestion.findOne({ ticketId });
    expect(suggestion).toBeTruthy();
    expect(suggestion.predictedCategory).toBeDefined();
    expect(suggestion.confidence).toBeGreaterThan(0);
    expect(suggestion.draftReply).toBeDefined();
    expect(suggestion.articleIds).toBeInstanceOf(Array);

    // Verify audit logs were created
    const auditLogs = await AuditLog.find({ 
      ticketId,
      traceId: 'test-trace-123'
    }).sort({ timestamp: 1 });
    
    expect(auditLogs.length).toBeGreaterThan(0);
    
    // Check for expected audit log actions
    const actions = auditLogs.map(log => log.action);
    expect(actions).toContain('AGENT_CLASSIFIED');
    expect(actions).toContain('KB_RETRIEVED');
    expect(actions).toContain('DRAFT_GENERATED');
  });

  test('should classify billing ticket correctly', async () => {
    await request(app)
      .post('/api/agent/triage')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ ticketId: String(ticketId) });

    const suggestion = await AgentSuggestion.findOne({ ticketId });
    expect(suggestion.predictedCategory).toBe('billing');
    expect(suggestion.confidence).toBeGreaterThan(0.5);
  });

  test('should auto-close high confidence tickets when enabled', async () => {
    // Create a ticket with keywords that should get high confidence
    const highConfidenceTicket = await Ticket.create({
      title: 'Refund request for billing issue',
      description: 'I need a refund for my invoice payment',
      category: 'other',
      createdBy: userId
    });

    await request(app)
      .post('/api/agent/triage')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ ticketId: String(highConfidenceTicket._id) });

    // Check if ticket was auto-closed (depends on confidence threshold)
    const updatedTicket = await Ticket.findById(highConfidenceTicket._id);
    const suggestion = await AgentSuggestion.findOne({ ticketId: highConfidenceTicket._id });
    
    if (suggestion.confidence >= 0.78) { // default threshold
      expect(updatedTicket.status).toBe('resolved');
      expect(suggestion.autoClosed).toBe(true);
      
      // Should have AUTO_CLOSED audit log
      const autoCloseLog = await AuditLog.findOne({
        ticketId: highConfidenceTicket._id,
        action: 'AUTO_CLOSED'
      });
      expect(autoCloseLog).toBeTruthy();
    } else {
      expect(updatedTicket.status).toBe('waiting_human');
      expect(suggestion.autoClosed).toBe(false);
    }
  });

  test('should assign to human for low confidence tickets', async () => {
    // Create a ticket with vague description (should get low confidence)
    const lowConfidenceTicket = await Ticket.create({
      title: 'Help me',
      description: 'Something is wrong',
      category: 'other',
      createdBy: userId
    });

    await request(app)
      .post('/api/agent/triage')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ ticketId: String(lowConfidenceTicket._id) });

    const updatedTicket = await Ticket.findById(lowConfidenceTicket._id);
    const suggestion = await AgentSuggestion.findOne({ ticketId: lowConfidenceTicket._id });
    
    expect(suggestion.confidence).toBeLessThan(0.78);
    expect(updatedTicket.status).toBe('waiting_human');
    expect(suggestion.autoClosed).toBe(false);

    // Should have ASSIGNED_TO_HUMAN audit log
    const assignLog = await AuditLog.findOne({
      ticketId: lowConfidenceTicket._id,
      action: 'ASSIGNED_TO_HUMAN'
    });
    expect(assignLog).toBeTruthy();
  });

  test('should get agent suggestion for ticket', async () => {
    // First run triage
    await request(app)
      .post('/api/agent/triage')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ ticketId: String(ticketId) });

    // Then get the suggestion
    const response = await request(app)
      .get(`/api/agent/suggestion/${ticketId}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.ticketId).toBe(String(ticketId));
    expect(response.body.data.predictedCategory).toBeDefined();
    expect(response.body.data.draftReply).toBeDefined();
    expect(response.body.data.confidence).toBeDefined();
    expect(response.body.data.articleIds).toBeInstanceOf(Array);
  });
});
