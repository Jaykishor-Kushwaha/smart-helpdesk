export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ ok:false, error:{ message:'Forbidden' }});
  }
  next();
};