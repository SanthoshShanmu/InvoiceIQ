"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setEmail(data.email || '');
      }
      
      // Get account connections
      const { data: connectionData } = await supabase
        .from('account_connections')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (connectionData) {
        setConnections(connectionData);
      }
      
      setLoading(false);
    }
    
    getProfile();
  }, [router, supabase]);
  
  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      setMessage(null);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setMessage({
        type: 'success',
        text: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const addConnection = async (provider: string) => {
    // This would typically open an OAuth flow
    alert(`Would connect to ${provider} via OAuth`);
  };
  
  const removeConnection = async (connectionId: string) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', connectionId);
      
      if (error) throw error;
      
      // Update local state
      setConnections(connections.filter(conn => conn.id !== connectionId));
      
      setMessage({
        type: 'success',
        text: 'Connection removed successfully',
      });
    } catch (error) {
      console.error('Error removing connection:', error);
      setMessage({
        type: 'error',
        text: 'Failed to remove connection',
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'profile' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'integrations' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('integrations')}
          >
            Integrations
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'security' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'notifications' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
        </div>
        
        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <p>{message.text}</p>
            </div>
          )}
          
          {activeTab === 'profile' && (
            <form onSubmit={updateProfile}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-gray-50 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {activeTab === 'integrations' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connected accounts</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-5 sm:px-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Email Providers</h4>
                      <p className="text-xs text-gray-500 mt-1">Connect your email to import invoices automatically</p>
                    </div>
                    <div>
                      <button
                        onClick={() => addConnection('gmail')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Connect Gmail
                      </button>
                      <button
                        onClick={() => addConnection('outlook')}
                        className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        Connect Outlook
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-5 sm:p-6">
                    {connections.filter(conn => conn.provider === 'gmail' || conn.provider === 'outlook').length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {connections
                          .filter(conn => conn.provider === 'gmail' || conn.provider === 'outlook')
                          .map((connection) => (
                            <li key={connection.id} className="py-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{connection.provider}</p>
                                <p className="text-sm text-gray-500">{connection.credentials.email}</p>
                              </div>
                              <button
                                onClick={() => removeConnection(connection.id)}
                                className="text-sm text-red-600 hover:text-red-900"
                              >
                                Disconnect
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No email providers connected</p>
                    )}
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-5 sm:px-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Accounting Software</h4>
                      <p className="text-xs text-gray-500 mt-1">Connect your accounting software to export processed invoices</p>
                    </div>
                    <div>
                      <button
                        onClick={() => addConnection('quickbooks')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Connect QuickBooks
                      </button>
                      <button
                        onClick={() => addConnection('xero')}
                        className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        Connect Xero
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-5 sm:p-6">
                    {connections.filter(conn => conn.provider === 'quickbooks' || conn.provider === 'xero').length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {connections
                          .filter(conn => conn.provider === 'quickbooks' || conn.provider === 'xero')
                          .map((connection) => (
                            <li key={connection.id} className="py-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{connection.provider}</p>
                                <p className="text-sm text-gray-500">{connection.credentials.username || connection.credentials.email}</p>
                              </div>
                              <button
                                onClick={() => removeConnection(connection.id)}
                                className="text-sm text-red-600 hover:text-red-900"
                              >
                                Disconnect
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No accounting software connected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change password</h3>
                <div className="max-w-md">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current password
                      </label>
                      <div className="mt-1">
                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New password
                      </label>
                      <div className="mt-1">
                        <input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm new password
                      </label>
                      <div className="mt-1">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Update password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Two-factor authentication</h3>
                <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account</p>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Enable two-factor authentication
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="comments"
                      name="comments"
                      type="checkbox"
                      defaultChecked
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="comments" className="font-medium text-gray-700">Invoice reminders</label>
                    <p className="text-gray-500">Get notified when invoices are approaching their due date</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="candidates"
                      name="candidates"
                      type="checkbox"
                      defaultChecked
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="candidates" className="font-medium text-gray-700">Payment confirmations</label>
                    <p className="text-gray-500">Get notified when payments are processed</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="offers"
                      name="offers"
                      type="checkbox"
                      defaultChecked
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="offers" className="font-medium text-gray-700">Anomaly alerts</label>
                    <p className="text-gray-500">Get notified when unusual transactions are detected</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    type="button"
                    className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Save notification preferences
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}