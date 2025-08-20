import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();
router.get('/tickets/:id/audit', requireAuth, async (req, res) => {
  const logs = await AuditLog.find({ ticketId: req.params.id }).sort({ timestamp: 1 }).lean();
  res.json({ ok:true, data: logs });
});
export default router;