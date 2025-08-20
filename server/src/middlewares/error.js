import { logger } from '../lib/logger.js';

export function errorHandler(err, req, res, next) {
  // Log error with context but don't expose sensitive info
  logger.error('Unhandled error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  if (res.headersSent) {
    return next(err);
  }

  // Handle specific error types
  let status = 500;
  let message = 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate entry';
  } else if (err.status) {
    status = err.status;
    message = err.message;
  }

  // Don't expose internal errors in production
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  res.status(status).json({
    ok: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}