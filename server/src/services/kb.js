import { Article } from '../models/Article.js';
export const KBService = {
  async search(query) {
    if (!query) return Article.find({ status: 'published' }).limit(20);
    return Article.find({ $text: { $search: query }, status: 'published' }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
  }
};