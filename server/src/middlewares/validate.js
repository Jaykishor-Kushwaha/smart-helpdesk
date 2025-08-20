export const validate = (schema) => (req, res, next) => {
  try {
    const o = schema.parse({ body: req.body, query: req.query, params: req.params });
    req.valid = o;
    next();
  } catch (e) {
    const firstError = e.errors?.[0];
    return res.status(400).json({
      ok: false,
      error: {
        message: firstError?.message || 'Invalid input',
        field: firstError?.path?.join('.') || 'unknown',
        details: e.errors || []
      }
    });
  }
};