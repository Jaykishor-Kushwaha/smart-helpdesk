export const timeout = (ms = 30000) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        ok: false,
        error: {
          message: 'Request timeout',
          code: 'TIMEOUT'
        }
      });
    }
  }, ms);

  // Clear timeout if response is sent
  const originalSend = res.send;
  res.send = function(...args) {
    clearTimeout(timer);
    return originalSend.apply(this, args);
  };

  const originalJson = res.json;
  res.json = function(...args) {
    clearTimeout(timer);
    return originalJson.apply(this, args);
  };

  const originalEnd = res.end;
  res.end = function(...args) {
    clearTimeout(timer);
    return originalEnd.apply(this, args);
  };

  next();
};
