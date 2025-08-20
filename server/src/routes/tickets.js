import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ticketCreationLimiter } from '../middlewares/rateLimiting.js';
import { Ticket } from '../models/Ticket.js';
import { runTriage } from '../services/agent.js';
import { AuditLog } from '../models/AuditLog.js';
import { CreateTicketSchema, MongoIdParam, AssignTicketSchema } from '../schemas/validation.js';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/', requireAuth, ticketCreationLimiter, validate(CreateTicketSchema), async (req, res) => {
  const ticketData = { ...req.valid.body, createdBy: req.user.sub };
  const t = await Ticket.create(ticketData);
  const traceId = randomUUID();
  await AuditLog.create({ ticketId: t._id, traceId, actor: 'user', action: 'TICKET_CREATED', meta: {}, timestamp: new Date() });
  runTriage({ ticketId: t._id, traceId }).catch(console.error);
  res.status(201).json({ ok:true, data: t });
});

router.get('/', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.mine === 'true') filter.createdBy = req.user.sub;
  const list = await Ticket.find(filter).sort({ createdAt: -1 }).populate('assignee','name').lean();
  res.json({ ok:true, data: list });
});

router.get('/:id', requireAuth, validate(MongoIdParam), async (req, res) => {
  const t = await Ticket.findById(req.valid.params.id).populate('assignee','name').lean();
  if (!t) {
    return res.status(404).json({ ok: false, error: { message: 'Ticket not found' } });
  }
  res.json({ ok:true, data: t });
});

router.post('/:id/reply', requireAuth, requireRole('agent','admin'), async (req,res)=>{
  const t = await Ticket.findById(req.params.id);
  if (!t) return res.status(404).json({ ok:false, error:{ message:'Not found' }});
  t.status = req.body.reopen ? 'open' : 'resolved';
  await t.save();
  await AuditLog.create({ ticketId: t._id, traceId: randomUUID(), actor: 'agent', action: 'REPLY_SENT', meta: { body: req.body.body || '' }, timestamp: new Date() });
  res.json({ ok:true, data: t });
});

router.post('/:id/assign', requireAuth, requireRole('agent','admin'), validate(AssignTicketSchema), async (req,res)=>{
  const t = await Ticket.findByIdAndUpdate(req.valid.params.id, { assignee: req.valid.body.assignee }, { new: true });
  if (!t) {
    return res.status(404).json({ ok: false, error: { message: 'Ticket not found' } });
  }
  await AuditLog.create({ ticketId: t._id, traceId: randomUUID(), actor: 'agent', action: 'ASSIGNED', meta: { assignee: req.valid.body.assignee }, timestamp: new Date() });
  res.json({ ok:true, data: t });
});

export default router;