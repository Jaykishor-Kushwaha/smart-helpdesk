import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/error.js';
import { generalLimiter, speedLimiter } from './middlewares/rateLimiting.js';
import { timeout } from './middlewares/timeout.js';
import { idempotency } from './middlewares/idempotency.js';

import auth from './routes/auth.js';
import kb from './routes/kb.js';
import tickets from './routes/tickets.js';
import agent from './routes/agent.js';
import cfg from './routes/config.js';
import audit from './routes/audit.js';
import replies from './routes/replies.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Custom CORS middleware for development
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  });

  // Rate limiting and performance
  app.use(generalLimiter);
  app.use(speedLimiter);

  // Request processing
  app.use(express.json({ limit: '1mb' }));
  app.use(timeout(30000)); // 30 second timeout
  app.use(idempotency);
  app.use(requestLogger);

  app.get('/healthz', (req,res)=>res.send('ok'));
  app.get('/readyz', (req,res)=>res.send('ready'));

  app.use('/api/auth', auth);
  app.use('/api/kb', kb);
  app.use('/api/tickets', tickets);
  app.use('/api/agent', agent);
  app.use('/api/config', cfg);
  app.use('/api', audit);
  app.use('/api', replies);

  app.use(errorHandler);
  return app;
}