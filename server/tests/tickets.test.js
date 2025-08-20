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

describe('Tickets', () => {
  let userToken;
  let agentToken;
  let userId;

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

    // Create agent
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
  });

  test('should create ticket successfully', async () => {
    const ticketData = mockTickets[0];

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ticketData)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.title).toBe(ticketData.title);
    expect(response.body.data.description).toBe(ticketData.description);
    expect(response.body.data.category).toBe(ticketData.category);
    expect(response.body.data.status).toBe('open');
    expect(response.body.data.createdBy).toBe(String(userId));

    // Verify audit log was created
    const auditLog = await AuditLog.findOne({ 
      ticketId: response.body.data._id,
      action: 'TICKET_CREATED'
    });
    expect(auditLog).toBeTruthy();
    expect(auditLog.actor).toBe('user');
  });

  test('should get tickets list', async () => {
    // Create a test ticket first
    const ticket = await Ticket.create({
      ...mockTickets[0],
      createdBy: userId
    });

    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    const foundTicket = response.body.data.find(t => t._id === String(ticket._id));
    expect(foundTicket).toBeTruthy();
  });

  test('should get specific ticket by ID', async () => {
    const ticket = await Ticket.create({
      ...mockTickets[1],
      createdBy: userId
    });

    const response = await request(app)
      .get(`/api/tickets/${ticket._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data._id).toBe(String(ticket._id));
    expect(response.body.data.title).toBe(ticket.title);
  });

  test('should filter tickets by status', async () => {
    // Create tickets with different statuses
    await Ticket.create({
      ...mockTickets[0],
      createdBy: userId,
      status: 'open'
    });
    
    await Ticket.create({
      ...mockTickets[1],
      createdBy: userId,
      status: 'resolved'
    });

    const response = await request(app)
      .get('/api/tickets?status=open')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    
    // All returned tickets should have 'open' status
    response.body.data.forEach(ticket => {
      expect(ticket.status).toBe('open');
    });
  });

  test('should filter user\'s own tickets', async () => {
    // Create another user
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@test.com',
      password_hash: 'hashedpassword',
      role: 'user'
    });

    // Create tickets for both users
    await Ticket.create({
      ...mockTickets[0],
      createdBy: userId
    });
    
    await Ticket.create({
      ...mockTickets[1],
      createdBy: otherUser._id
    });

    const response = await request(app)
      .get('/api/tickets?mine=true')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    
    // All returned tickets should belong to the current user
    response.body.data.forEach(ticket => {
      expect(ticket.createdBy).toBe(String(userId));
    });
  });
});
