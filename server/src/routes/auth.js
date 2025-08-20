import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signJwt } from '../lib/jwt.js';
import { validate } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiting.js';
import { RegisterSchema, LoginSchema } from '../schemas/validation.js';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), async (req, res) => {
  const { name, email, password } = req.valid.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ ok:false, error:{ message:'Email exists' }});
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password_hash, role: 'user' });
  const token = signJwt({ sub: String(user._id), email, role: user.role, name: user.name });
  return res.json({ ok:true, data:{ token } });
});

router.post('/login', authLimiter, validate(LoginSchema), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ ok:false, error:{ message:'Invalid credentials' }});
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok:false, error:{ message:'Invalid credentials' }});
  const token = signJwt({ sub: String(user._id), email, role: user.role, name: user.name });
  return res.json({ ok:true, data:{ token } });
});

export default router;