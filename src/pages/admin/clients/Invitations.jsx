// src/pages/admin/clients/Invitations.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AdminIcon';
import { useToast } from '../../../components/ui/Toast';

const ClientInvitations = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select(`
          *,
          invited_by:profiles!invited_by(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (invitation) => {
    try {
      const inviteUrl = `${window.location.origin}/accept-invite?token=${invitation.token}`;
      navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const cancelInvitation = async (id) => {
    try {
      const { error } = await supabase
        .from('client_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Invitation cancelled');
      loadInvitations();
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading-bold uppercase">Client Invitations</h1>
        <Button
          variant="default"
          onClick={() => navigate('/clients/invite')}
          iconName="UserPlus"
          className="bg-accent hover:bg-accent/90"
        >
          New Invitation
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invitations found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Email</th>
                  <th className="text-left py-3">Company</th>
                  <th className="text-left py-3">Invited By</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Expires</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b">
                    <td className="py-4">{invitation.email}</td>
                    <td className="py-4">{invitation.metadata?.company_name || '-'}</td>
                    <td className="py-4">{invitation.invited_by?.full_name || '-'}</td>
                    <td className="py-4">
                      {isExpired(invitation.expires_at) && invitation.status === 'pending' 
                        ? getStatusBadge('expired')
                        : getStatusBadge(invitation.status)
                      }
                    </td>
                    <td className="py-4">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <div className="flex space-x-2">
                        {invitation.status === 'pending' && !isExpired(invitation.expires_at) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvitation(invitation)}
                            >
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Cancel
                            </Button>
                          </>
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

export default ClientInvitations;