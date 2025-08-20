import { randomUUID } from 'crypto';

// In-memory store for idempotency keys (in production, use Redis)
const idempotencyStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, data] of idempotencyStore.entries()) {
    if (now - data.timestamp > maxAge) {
      idempotencyStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export const idempotency = (req, res, next) => {
  // Only apply to POST/PUT/PATCH requests
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    // Generate one if not provided for critical operations
    if (req.path.includes('/tickets') || req.path.includes('/triage')) {
      req.headers['idempotency-key'] = randomUUID();
    }
    return next();
  }

  // Validate idempotency key format
  if (!/^[a-zA-Z0-9\-_]{1,255}$/.test(idempotencyKey)) {
    return res.status(400).json({
      ok: false,
      error: {
        message: 'Invalid idempotency key format',
        code: 'INVALID_IDEMPOTENCY_KEY'
      }
    });
  }

  const key = `${req.user?.sub || 'anonymous'}:${req.method}:${req.path}:${idempotencyKey}`;
  const existing = idempotencyStore.get(key);

  if (existing) {
    // Return cached response
    return res.status(existing.status).json(existing.body);
  }

  // Store the original res.json to capture the response
  const originalJson = res.json;
  res.json = function(body) {
    // Cache the response
    idempotencyStore.set(key, {
      status: res.statusCode,
      body,
      timestamp: Date.now()
    });
    
    return originalJson.call(this, body);
  };

  next();
};
