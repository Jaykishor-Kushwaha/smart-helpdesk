
import { useState, useEffect } from 'react';
import { useAuth } from '../store/auth';
import http from '../api/http';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    minConfidence: '',
    maxAge: ''
  });
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [customReply, setCustomReply] = useState('');
  const [resolveTicket, setResolveTicket] = useState(true);

  useEffect(() => {
    if (user?.role === 'agent' || user?.role === 'admin') {
      loadSuggestions();
    }
  }, [user, filters]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.minConfidence) params.append('minConfidence', filters.minConfidence);
      if (filters.maxAge) params.append('maxAge', filters.maxAge);
      
      const { data } = await http.get(`/agent/suggestions?${params}`);
      setSuggestions(data.data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    try {
      await http.post(`/agent/suggestions/${selectedSuggestion._id}/reply`, {
        customReply: customReply.trim() || undefined,
        resolveTicket
      });
      
      setShowReplyModal(false);
      setCustomReply('');
      setSelectedSuggestion(null);
      loadSuggestions(); // Refresh the list
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

  const handleRegenerateSuggestion = async (suggestionId, template = 'default') => {
    try {
      await http.post(`/agent/suggestions/${suggestionId}/regenerate`, { template });
      loadSuggestions(); // Refresh the list
    } catch (error) {
      console.error('Failed to regenerate suggestion:', error);
      alert('Failed to regenerate suggestion. Please try again.');
    }
  };

  const openReplyModal = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setCustomReply(suggestion.draftReply);
    setShowReplyModal(true);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      billing: '💳',
      tech: '🔧',
      shipping: '📦',
      other: '❓'
    };
    return icons[category] || '❓';
  };

  if (user?.role !== 'agent' && user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">You need agent or admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Review and manage AI-generated ticket suggestions</p>
        </div>
        <button
          onClick={loadSuggestions}
          className="btn-secondary"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="billing">💳 Billing</option>
              <option value="tech">🔧 Technical</option>
              <option value="shipping">📦 Shipping</option>
              <option value="other">❓ Other</option>
            </select>
          </div>
          <div>
            <label className="label">Min Confidence</label>
            <select
              className="input"
              value={filters.minConfidence}
              onChange={(e) => setFilters({ ...filters, minConfidence: e.target.value })}
            >
              <option value="">Any Confidence</option>
              <option value="0.8">High (80%+)</option>
              <option value="0.6">Medium (60%+)</option>
              <option value="0.4">Low (40%+)</option>
            </select>
          </div>
          <div>
            <label className="label">Max Age (hours)</label>
            <select
              className="input"
              value={filters.maxAge}
              onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
            >
              <option value="">Any Age</option>
              <option value="1">Last Hour</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No pending suggestions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {suggestions.map((suggestion) => (
              <div key={suggestion._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{getCategoryIcon(suggestion.predictedCategory)}</span>
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {suggestion.ticketId?.title || 'Unknown Ticket'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {suggestion.ticketId?.description || 'No description'}
                    </p>
                    <div className="bg-gray-50 p-3 rounded-md mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Reply:</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {suggestion.draftReply}
                      </p>
                    </div>
                    {suggestion.articleIds && suggestion.articleIds.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Referenced Articles:</h4>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.articleIds.map((article) => (
                            <span key={article._id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {article.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => openReplyModal(suggestion)}
                      className="btn-primary text-sm"
                    >
                      Send Reply
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleRegenerateSuggestion(suggestion._id, 'default')}
                        className="btn-secondary text-xs"
                        title="Regenerate with default template"
                      >
                        Regenerate
                      </button>
                      <button
                        onClick={() => handleRegenerateSuggestion(suggestion._id, 'detailed')}
                        className="btn-secondary text-xs"
                        title="Regenerate with detailed template"
                      >
                        Detailed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedSuggestion && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Send Reply to: {selectedSuggestion.ticketId?.title}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">Reply Message</label>
                <textarea
                  className="input"
                  rows="8"
                  value={customReply}
                  onChange={(e) => setCustomReply(e.target.value)}
                  placeholder="Edit the suggested reply or write your own..."
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="resolveTicket"
                  checked={resolveTicket}
                  onChange={(e) => setResolveTicket(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="resolveTicket" className="ml-2 block text-sm text-gray-900">
                  Mark ticket as resolved after sending reply
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReplyModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                className="btn-primary"
                disabled={!customReply.trim()}
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


