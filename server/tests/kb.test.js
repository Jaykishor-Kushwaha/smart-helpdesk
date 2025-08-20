import { describe, test, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Article } from '../src/models/Article.js';
import { User } from '../src/models/User.js';
import { signJwt } from '../src/lib/jwt.js';
import { mockUsers, mockArticles } from './fixtures.js';
import './setup.js';

const app = createApp();

describe('Knowledge Base', () => {
  let adminToken;
  let userToken;

  beforeEach(async () => {
    // Create admin user
    const admin = await User.create({
      ...mockUsers.admin,
      password_hash: 'hashedpassword'
    });
    adminToken = signJwt({ 
      sub: String(admin._id), 
      email: admin.email, 
      role: admin.role, 
      name: admin.name 
    });

    // Create regular user
    const user = await User.create({
      ...mockUsers.user,
      password_hash: 'hashedpassword'
    });
    userToken = signJwt({ 
      sub: String(user._id), 
      email: user.email, 
      role: user.role, 
      name: user.name 
    });

    // Create test articles
    await Article.insertMany(mockArticles);
  });

  test('should search KB articles successfully', async () => {
    const response = await request(app)
      .get('/api/kb?query=billing')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Should find billing-related article
    const billingArticle = response.body.data.find(article => 
      article.title.includes('Billing') || article.tags.includes('billing')
    );
    expect(billingArticle).toBeTruthy();
  });

  test('should return all articles when no query provided', async () => {
    const response = await request(app)
      .get('/api/kb')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(mockArticles.length);
  });

  test('should allow admin to create KB article', async () => {
    const newArticle = {
      title: 'New Test Article',
      body: 'This is a test article body',
      tags: ['test', 'new'],
      status: 'published'
    };

    const response = await request(app)
      .post('/api/kb')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newArticle)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.title).toBe(newArticle.title);
    expect(response.body.data.tags).toEqual(newArticle.tags);
  });

  test('should reject non-admin user creating KB article', async () => {
    const newArticle = {
      title: 'Unauthorized Article',
      body: 'This should fail',
      tags: ['test'],
      status: 'published'
    };

    const response = await request(app)
      .post('/api/kb')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newArticle)
      .expect(403);

    expect(response.body.ok).toBe(false);
  });

  test('should allow admin to update KB article', async () => {
    const article = await Article.findOne({ title: 'Billing FAQ' });
    
    const updates = {
      title: 'Updated Billing FAQ',
      body: 'Updated content'
    };

    const response = await request(app)
      .put(`/api/kb/${article._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updates)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.title).toBe(updates.title);
    expect(response.body.data.body).toBe(updates.body);
  });
});
