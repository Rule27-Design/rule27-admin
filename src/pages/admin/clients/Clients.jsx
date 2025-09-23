// src/pages/admin/clients/Clients.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AdminIcon';
import { useToast } from '../../../components/ui/Toast';

const AdminClients = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUserRole();
    loadClients();
  }, [filter]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    
    setUserRole(profile?.role);
  };

  const loadClients = async () => {
    try {
      let query = supabase
        .from('clients')
        .select(`
          *,
          profile:profiles!profile_id (
            full_name,
            email,
            company_name,
            client_status
          ),
          assignments:client_manager_assignments (
            manager:profiles!manager_id (
              id,
              full_name
            ),
            is_primary
          ),
          projects:client_projects (count),
          tickets:support_tickets (count)
        `);

      if (filter !== 'all') {
        query = query.eq('account_status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getPrimaryManager = (assignments) => {
    const primary = assignments?.find(a => a.is_primary);
    return primary?.manager || assignments?.[0]?.manager;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading-bold uppercase">Clients</h1>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/clients/invitations')}
            iconName="Mail"
          >
            Invitations
          </Button>
          <Button
            variant="default"
            onClick={() => navigate('/clients/invite')}
            iconName="UserPlus"
            className="bg-accent hover:bg-accent/90"
          >
            Invite Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-accent text-white' : 'bg-gray-100'}`}
          >
            All Clients
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg ${filter === 'active' ? 'bg-accent text-white' : 'bg-gray-100'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('trial')}
            className={`px-4 py-2 rounded-lg ${filter === 'trial' ? 'bg-accent text-white' : 'bg-gray-100'}`}
          >
            Trial
          </button>
          <button
            onClick={() => setFilter('suspended')}
            className={`px-4 py-2 rounded-lg ${filter === 'suspended' ? 'bg-accent text-white' : 'bg-gray-100'}`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Client</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Manager</th>
                  <th className="text-left py-3">Projects</th>
                  <th className="text-left py-3">Tickets</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-gray-50">
                    <td className="py-4">
                      <div>
                        <div className="font-medium">{client.profile?.full_name}</div>
                        <div className="text-sm text-gray-600">{client.profile?.company_name}</div>
                        <div className="text-xs text-gray-500">{client.profile?.email}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      {getStatusBadge(client.account_status)}
                    </td>
                    <td className="py-4">
                      {getPrimaryManager(client.assignments)?.full_name || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="text-sm">{client.projects?.[0]?.count || 0}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-sm">{client.tickets?.[0]?.count || 0}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          View
                        </Button>
                        {userRole === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}/edit`)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClients;