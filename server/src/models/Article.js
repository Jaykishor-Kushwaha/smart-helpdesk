import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  tags: [{ type: String }],
  status: { type: String, enum: ['draft','published'], default: 'draft' },
}, { timestamps: { createdAt: false, updatedAt: true } });

ArticleSchema.index({ title: 'text', body: 'text', tags: 'text' });

export const Article = mongoose.model('Article', ArticleSchema);