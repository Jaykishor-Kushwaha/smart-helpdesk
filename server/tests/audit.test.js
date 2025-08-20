import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { signJwt } from '../src/lib/jwt.js';
import { mockUsers, mockTickets } from './fixtures.js';
import './setup.js';

const app = createApp();

describe('Audit Logging', () => {
  let userToken;
  let userId;
  let ticketId;

  beforeEach(async () => {
    // Create user
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

    // Create a test ticket
    const ticket = await Ticket.create({
      ...mockTickets[0],
      createdBy: userId
    });
    ticketId = ticket._id;
  });

  test('should create audit log when ticket is created', async () => {
    const ticketData = mockTickets[1];

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ticketData)
      .expect(201);

    const newTicketId = response.body.data._id;

    // Check audit log was created
    const auditLog = await AuditLog.findOne({
      ticketId: newTicketId,
      action: 'TICKET_CREATED'
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.actor).toBe('user');
    expect(auditLog.traceId).toBeDefined();
    expect(auditLog.timestamp).toBeInstanceOf(Date);
    expect(auditLog.meta).toBeDefined();
  });

  test('should get audit logs for a ticket', async () => {
    // Create some audit logs
    const traceId = 'test-trace-456';
    const baseTime = Date.now();
    const auditLogs = [
      {
        ticketId,
        traceId,
        actor: 'user',
        action: 'TICKET_CREATED',
        meta: { category: 'billing' },
        timestamp: new Date(baseTime)
      },
      {
        ticketId,
        traceId,
        actor: 'system',
        action: 'AGENT_CLASSIFIED',
        meta: { predictedCategory: 'billing', confidence: 0.85 },
        timestamp: new Date(baseTime + 1000)
      },
      {
        ticketId,
        traceId,
        actor: 'system',
        action: 'KB_RETRIEVED',
        meta: { articleIds: ['article1', 'article2'] },
        timestamp: new Date(baseTime + 2000)
      }
    ];

    await AuditLog.insertMany(auditLogs);

    const response = await request(app)
      .get(`/api/tickets/${ticketId}/audit`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(auditLogs.length);

    // Should be sorted by timestamp (newest first)
    const timestamps = response.body.data.map(log => new Date(log.timestamp));
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i-1].getTime()).toBeGreaterThanOrEqual(timestamps[i].getTime());
    }

    // Check audit log structure
    const firstLog = response.body.data[0];
    expect(firstLog.ticketId).toBe(String(ticketId));
    expect(firstLog.traceId).toBe(traceId);
    expect(firstLog.actor).toBeDefined();
    expect(firstLog.action).toBeDefined();
    expect(firstLog.meta).toBeDefined();
    expect(firstLog.timestamp).toBeDefined();
  });

  test('should maintain trace ID consistency across related actions', async () => {
    const traceId = 'consistent-trace-789';
    
    // Create multiple audit logs with same trace ID
    const auditLogs = [
      {
        ticketId,
        traceId,
        actor: 'system',
        action: 'AGENT_CLASSIFIED',
        meta: {},
        timestamp: new Date()
      },
      {
        ticketId,
        traceId,
        actor: 'system',
        action: 'KB_RETRIEVED',
        meta: {},
        timestamp: new Date(Date.now() + 1000)
      },
      {
        ticketId,
        traceId,
        actor: 'system',
        action: 'DRAFT_GENERATED',
        meta: {},
        timestamp: new Date(Date.now() + 2000)
      }
    ];

    await AuditLog.insertMany(auditLogs);

    const response = await request(app)
      .get(`/api/tickets/${ticketId}/audit`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // All logs should have the same trace ID
    response.body.data.forEach(log => {
      expect(log.traceId).toBe(traceId);
    });
  });

  test('should store meaningful metadata in audit logs', async () => {
    const auditLog = await AuditLog.create({
      ticketId,
      traceId: 'meta-test-trace',
      actor: 'system',
      action: 'AGENT_CLASSIFIED',
      meta: {
        predictedCategory: 'billing',
        confidence: 0.87,
        modelInfo: {
          provider: 'stub',
          model: 'heuristic-v1',
          promptVersion: '1.0',
          latencyMs: 150
        }
      },
      timestamp: new Date()
    });

    const response = await request(app)
      .get(`/api/tickets/${ticketId}/audit`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const foundLog = response.body.data.find(log => log._id === String(auditLog._id));
    expect(foundLog).toBeTruthy();
    expect(foundLog.meta.predictedCategory).toBe('billing');
    expect(foundLog.meta.confidence).toBe(0.87);
    expect(foundLog.meta.modelInfo).toBeDefined();
    expect(foundLog.meta.modelInfo.provider).toBe('stub');
  });

  test('should handle empty audit logs gracefully', async () => {
    // Create a ticket with no audit logs
    const emptyTicket = await Ticket.create({
      title: 'Empty Audit Ticket',
      description: 'No audit logs',
      createdBy: userId
    });

    const response = await request(app)
      .get(`/api/tickets/${emptyTicket._id}/audit`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(0);
  });
});
