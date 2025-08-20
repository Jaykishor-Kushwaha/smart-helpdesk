import 'dotenv/config';
export const config = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/helpdesk',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  autoCloseEnabled: (process.env.AUTO_CLOSE_ENABLED || 'true') === 'true',
  confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD || 0.78),
  stubMode: (process.env.STUB_MODE || 'true') === 'true',
  mailFrom: process.env.MAIL_FROM || 'noreply@helpdesk.local',

  // Security settings
  requestTimeout: Number(process.env.REQUEST_TIMEOUT) || 30000,
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
  trustProxy: process.env.TRUST_PROXY === 'true',

  // Rate limiting
  rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 5
};