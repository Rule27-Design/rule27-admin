// src/pages/admin/clients/ClientDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AdminIcon';
import { useToast } from '../../../components/ui/Toast';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadClient();
  }, [id]);

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          profile:profiles!profile_id (
            full_name,
            email,
            company_name,
            phone,
            client_status
          ),
          assignments:client_manager_assignments (
            manager:profiles!manager_id (
              id,
              full_name,
              email
            ),
            is_primary,
            assigned_at
          ),
          projects:client_projects (
            id,
            project_name,
            project_status,
            budget,
            start_date,
            end_date
          ),
          tickets:support_tickets (
            id,
            ticket_number,
            subject,
            status,
            priority,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-heading-bold uppercase mb-2">
              {client.profile?.full_name}
            </h1>
            <p className="text-gray-600">{client.profile?.company_name}</p>
            <p className="text-sm text-gray-500">{client.profile?.email}</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/clients/${id}/edit`)}
            >
              Edit Client
            </Button>
            <Button
              variant="default"
              className="bg-accent hover:bg-accent/90"
              onClick={() => navigate('/clients')}
            >
              Back to Clients
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['overview', 'projects', 'support', 'team'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Account Status</p>
                  <p className="font-medium capitalize">{client.account_status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client Type</p>
                  <p className="font-medium capitalize">{client.client_type || 'Standard'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract Start</p>
                  <p className="font-medium">
                    {client.contract_start ? new Date(client.contract_start).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Billing Cycle</p>
                  <p className="font-medium capitalize">{client.billing_cycle || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <div className="mb-4">
                <Button variant="outline" size="sm">
                  Add Project
                </Button>
              </div>
              {client.projects && client.projects.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Project Name</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Budget</th>
                      <th className="text-left py-2">Timeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.projects.map((project) => (
                      <tr key={project.id} className="border-b">
                        <td className="py-3">{project.project_name}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {project.project_status}
                          </span>
                        </td>
                        <td className="py-3">${project.budget || 0}</td>
                        <td className="py-3">
                          {project.start_date} - {project.end_date || 'Ongoing'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No projects yet</p>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              {client.tickets && client.tickets.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ticket #</th>
                      <th className="text-left py-2">Subject</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Priority</th>
                      <th className="text-left py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b">
                        <td className="py-3">{ticket.ticket_number}</td>
                        <td className="py-3">{ticket.subject}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3">{ticket.priority}</td>
                        <td className="py-3">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No support tickets</p>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div>
              <h3 className="font-medium mb-4">Assigned Team Members</h3>
              {client.assignments && client.assignments.length > 0 ? (
                <div className="space-y-3">
                  {client.assignments.map((assignment) => (
                    <div key={assignment.manager.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{assignment.manager.full_name}</p>
                        <p className="text-sm text-gray-600">{assignment.manager.email}</p>
                      </div>
                      {assignment.is_primary && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No team members assigned</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;