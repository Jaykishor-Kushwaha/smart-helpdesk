import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { Config } from '../models/Config.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  let cfg = await Config.findOne();
  if (!cfg) cfg = await Config.create({});
  res.json({ ok:true, data: cfg });
});

router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  let cfg = await Config.findOne();
  if (!cfg) cfg = await Config.create({});
  Object.assign(cfg, req.body);
  await cfg.save();
  res.json({ ok:true, data: cfg });
});

export default router;