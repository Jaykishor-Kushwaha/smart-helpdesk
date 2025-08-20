import { verifyJwt } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok:false, error:{ message:'Missing token' }});
  try {
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, error:{ message:'Invalid token' }});
  }
}