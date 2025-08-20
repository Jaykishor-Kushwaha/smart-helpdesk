import React, { useEffect, useState } from 'react';
import http from '../api/http';

export default function KB(){
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', tags: '', status: 'published' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    (async () => {
      await search();
      try {
        const me = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
        setIsAdmin(me.role === 'admin');
      } catch {}
    })();
  }, []);

  async function search() {
    setLoading(true);
    try {
      const { data } = await http.get('/kb', { params: { query: q } });
      setList(data.data);
    } catch (error) {
      console.error('Failed to search KB:', error);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!form.title.trim() || !form.body.trim()) {
      alert('Please fill in title and body');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) };
      const { data } = await http.post('/kb', payload);
      setList(v => [data.data, ...v]);
      setForm({ title: '', body: '', tags: '', status: 'published' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create article:', error);
      alert('Failed to create article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function update() {
    if (!form.title.trim() || !form.body.trim()) {
      alert('Please fill in title and body');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) };
      const { data } = await http.put(`/kb/${editingArticle._id}`, payload);
      setList(v => v.map(item => item._id === editingArticle._id ? data.data : item));
      setForm({ title: '', body: '', tags: '', status: 'published' });
      setEditingArticle(null);
    } catch (error) {
      console.error('Failed to update article:', error);
      alert('Failed to update article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    setLoading(true);
    try {
      await http.delete(`/kb/${id}`);
      setList(v => v.filter(i => i._id !== id));
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(article) {
    setEditingArticle(article);
    setForm({
      title: article.title,
      body: article.body,
      tags: (article.tags || []).join(', '),
      status: article.status
    });
    setShowCreateForm(true);
  }

  function cancelEdit() {
    setEditingArticle(null);
    setForm({ title: '', body: '', tags: '', status: 'published' });
    setShowCreateForm(false);
  }

  const filteredList = selectedCategory === 'all'
    ? list
    : list.filter(article =>
        article.tags && article.tags.some(tag =>
          tag.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      );

  const categories = ['all', 'billing', 'tech', 'shipping', 'account'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (tags) => {
    if (!tags || tags.length === 0) return '📄';
    if (tags.some(tag => tag.includes('billing'))) return '💳';
    if (tags.some(tag => tag.includes('tech'))) return '🔧';
    if (tags.some(tag => tag.includes('shipping'))) return '📦';
    if (tags.some(tag => tag.includes('account'))) return '👤';
    return '📄';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 Knowledge Base</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage support articles and documentation
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
            disabled={loading}
          >
            {showCreateForm ? 'Cancel' : '+ New Article'}
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search articles by title, content, or tags..."
                className="input pl-10"
                onKeyDown={e => e.key === 'Enter' && search()}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <button
            onClick={search}
            className="btn-secondary"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Category Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 self-center">Filter by category:</span>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {category === 'all' ? '📋 All' :
               category === 'billing' ? '💳 Billing' :
               category === 'tech' ? '🔧 Technical' :
               category === 'shipping' ? '📦 Shipping' :
               category === 'account' ? '👤 Account' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Article Form */}
      {isAdmin && showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="label">Article Title</label>
              <input
                type="text"
                placeholder="Enter a clear, descriptive title..."
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="input"
              />
            </div>

            <div>
              <label className="label">Content</label>
              <textarea
                placeholder="Write the article content with step-by-step instructions..."
                value={form.body}
                onChange={e => setForm({...form, body: e.target.value})}
                className="input resize-none"
                rows="8"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="billing, payments, refunds"
                  value={form.tags}
                  onChange={e => setForm({...form, tags: e.target.value})}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use tags like: billing, tech, shipping, account, payments, etc.
                </p>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="input"
                >
                  <option value="draft">📝 Draft</option>
                  <option value="published">✅ Published</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={cancelEdit}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={editingArticle ? update : create}
                className="btn-primary"
                disabled={loading || !form.title.trim() || !form.body.trim()}
              >
                {loading ? 'Saving...' : editingArticle ? 'Update Article' : 'Create Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            📄 Articles
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredList.length} {filteredList.length === 1 ? 'article' : 'articles'})
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📝</div>
            <p className="text-gray-500">
              {q ? 'No articles found matching your search.' : 'No articles available.'}
            </p>
            {isAdmin && !q && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary mt-4"
              >
                Create your first article
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredList.map(article => (
              <div key={article._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xl">{getCategoryIcon(article.tags)}</span>
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {article.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                        {article.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {article.body.substring(0, 200)}
                      {article.body.length > 200 && '...'}
                    </p>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {article.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Created {new Date(article.createdAt).toLocaleDateString()}
                      {article.updatedAt && article.updatedAt !== article.createdAt && (
                        <span> • Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEdit(article)}
                        className="btn-secondary text-sm"
                        title="Edit article"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => remove(article._id)}
                        className="btn-danger text-sm"
                        title="Delete article"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}