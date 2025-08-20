import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { mockUsers } from './fixtures.js';
import './setup.js';

const app = createApp();

describe('Authentication', () => {
  test('should register a new user successfully', async () => {
    const userData = mockUsers.user;
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.token).toBeDefined();
    
    // Verify user was created in database
    const user = await User.findOne({ email: userData.email });
    expect(user).toBeTruthy();
    expect(user.name).toBe(userData.name);
    expect(user.role).toBe('user');
  });

  test('should login with valid credentials', async () => {
    // Create user first
    const userData = mockUsers.admin;
    await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  test('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  test('should reject duplicate email registration', async () => {
    const userData = mockUsers.user;
    
    // Register first time
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(200);

    // Try to register again
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(409);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toBe('Email exists');
  });
});
