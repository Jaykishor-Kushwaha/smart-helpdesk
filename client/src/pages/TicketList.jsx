import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../api/http';
import { useAuth } from '../store/auth';

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  triaged: 'bg-purple-100 text-purple-800',
  waiting_human: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

const categoryIcons = {
  billing: '💳',
  tech: '🔧',
  shipping: '📦',
  other: '❓'
};

export default function TicketList(){
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', category: 'other' });
  const { user } = useAuth();

  useEffect(() => {
    async function load(){
      try {
        const { data } = await http.get(`/tickets?status=${filter}`);
        setTickets(data.data);
      } catch (error) {
        console.error('Failed to load tickets:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const { data } = await http.post('/tickets', newTicket);
      setTickets([data.data, ...tickets]);
      setNewTicket({ title: '', description: '', category: 'other' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track support requests
          </p>
        </div>
        {user?.role === 'user' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            + Create Ticket
          </button>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={newTicket.title}
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detailed description of the issue"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={newTicket.category}
                  onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                >
                  <option value="billing">💳 Billing</option>
                  <option value="tech">🔧 Technical</option>
                  <option value="shipping">📦 Shipping</option>
                  <option value="other">❓ Other</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="waiting_human">Waiting Human</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <span className="text-sm text-gray-500">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500">
              {filter ? 'Try adjusting your filters' : 'Create your first support ticket to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tickets.map(ticket => (
              <Link
                key={ticket._id}
                to={`/tickets/${ticket._id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {categoryIcons[ticket.category] || '❓'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ticket.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {ticket.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${statusColors[ticket.status] || 'badge-gray'}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}