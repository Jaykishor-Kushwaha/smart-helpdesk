import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { Article } from '../models/Article.js';
import { KBService } from '../services/kb.js';
import { CreateArticleSchema, UpdateArticleSchema, SearchKBSchema, MongoIdParam } from '../schemas/validation.js';

const router = Router();

router.get('/', requireAuth, validate(SearchKBSchema), async (req, res) => {
  const q = req.valid.query.query || '';
  const results = await KBService.search(q);
  res.json({ ok:true, data: results });
});

router.post('/', requireAuth, requireRole('admin'), validate(CreateArticleSchema), async (req, res) => {
  const a = await Article.create(req.valid.body);
  res.status(201).json({ ok:true, data: a });
});
router.put('/:id', requireAuth, requireRole('admin'), validate(UpdateArticleSchema), async (req, res) => {
  const a = await Article.findByIdAndUpdate(req.valid.params.id, req.valid.body, { new: true });
  if (!a) {
    return res.status(404).json({ ok: false, error: { message: 'Article not found' } });
  }
  res.json({ ok:true, data: a });
});
router.delete('/:id', requireAuth, requireRole('admin'), validate(MongoIdParam), async (req, res) => {
  const a = await Article.findByIdAndDelete(req.valid.params.id);
  if (!a) {
    return res.status(404).json({ ok: false, error: { message: 'Article not found' } });
  }
  res.json({ ok:true });
});

export default router;