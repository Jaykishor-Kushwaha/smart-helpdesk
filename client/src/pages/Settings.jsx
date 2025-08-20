import React, { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';
import http from '../api/http';

export default function Settings() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('agent');
  const [userSettings, setUserSettings] = useState({
    notifications: {
      email: true,
      browser: true,
      newTickets: true,
      agentSuggestions: true,
      systemUpdates: false
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      itemsPerPage: 10
    }
  });

  useEffect(() => {
    (async () => {
      const { data } = await http.get('/config');
      setCfg(data.data);
      try {
        const me = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
        setIsAdmin(me.role === 'admin');
      } catch {}
      loadUserSettings();
    })();
  }, []);

  async function loadUserSettings() {
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      try {
        setUserSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse user settings:', error);
      }
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await http.put('/config', cfg);
      setCfg(data.data);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveUserSettings() {
    setSaving(true);
    try {
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save user settings:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: 'agent', name: 'Agent Settings', icon: '🤖', adminOnly: true },
    { id: 'notifications', name: 'Notifications', icon: '🔔', adminOnly: false },
    { id: 'preferences', name: 'Preferences', icon: '⚙️', adminOnly: false },
    { id: 'system', name: 'System', icon: '🖥️', adminOnly: true }
  ].filter(tab => !tab.adminOnly || isAdmin);

  if (!cfg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage system configuration and personal preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Agent Settings Tab */}
        {activeTab === 'agent' && isAdmin && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 Agent Configuration</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Auto-close Tickets</h4>
                  <p className="text-sm text-gray-500">
                    Automatically close tickets when AI confidence is high enough
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.autoCloseEnabled || false}
                    onChange={e => setCfg({...cfg, autoCloseEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confidence Threshold: {Math.round((cfg.confidenceThreshold || 0.9) * 100)}%
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">50%</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={cfg.confidenceThreshold || 0.9}
                    onChange={e => setCfg({...cfg, confidenceThreshold: parseFloat(e.target.value)})}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-gray-500">100%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Tickets with AI confidence above this threshold will be auto-closed
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Agent Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🔔 Notification Preferences</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Email Notifications</h4>
                <div className="space-y-3">
                  {[
                    { key: 'newTickets', label: 'New ticket assignments', desc: 'Get notified when tickets are assigned to you' },
                    { key: 'agentSuggestions', label: 'AI suggestions ready', desc: 'Get notified when AI generates suggestions for review' },
                    { key: 'systemUpdates', label: 'System updates', desc: 'Get notified about system maintenance and updates' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{item.label}</h5>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userSettings.notifications[item.key]}
                          onChange={e => setUserSettings({
                            ...userSettings,
                            notifications: {
                              ...userSettings.notifications,
                              [item.key]: e.target.checked
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={saveUserSettings}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Personal Preferences</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Theme</label>
                  <select
                    value={userSettings.preferences.theme}
                    onChange={e => setUserSettings({
                      ...userSettings,
                      preferences: { ...userSettings.preferences, theme: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="light">🌞 Light</option>
                    <option value="dark">🌙 Dark</option>
                    <option value="auto">🔄 Auto</option>
                  </select>
                </div>

                <div>
                  <label className="label">Language</label>
                  <select
                    value={userSettings.preferences.language}
                    onChange={e => setUserSettings({
                      ...userSettings,
                      preferences: { ...userSettings.preferences, language: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="de">🇩🇪 German</option>
                  </select>
                </div>

                <div>
                  <label className="label">Timezone</label>
                  <select
                    value={userSettings.preferences.timezone}
                    onChange={e => setUserSettings({
                      ...userSettings,
                      preferences: { ...userSettings.preferences, timezone: e.target.value }
                    })}
                    className="input"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>

                <div>
                  <label className="label">Items per page</label>
                  <select
                    value={userSettings.preferences.itemsPerPage}
                    onChange={e => setUserSettings({
                      ...userSettings,
                      preferences: { ...userSettings.preferences, itemsPerPage: parseInt(e.target.value) }
                    })}
                    className="input"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={saveUserSettings}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && isAdmin && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🖥️ System Information</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Application Version</h4>
                  <p className="text-sm text-gray-600">Smart Helpdesk v1.0.0</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Database Status</h4>
                  <p className="text-sm text-green-600">✅ Connected</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">AI Service</h4>
                  <p className="text-sm text-green-600">✅ Active</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Last Backup</h4>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Maintenance Mode</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Enable maintenance mode to prevent new ticket submissions during system updates.
                </p>
                <button className="btn-secondary text-sm">
                  Enable Maintenance Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}