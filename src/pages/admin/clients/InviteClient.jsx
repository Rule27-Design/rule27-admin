// src/pages/admin/clients/InviteClient.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon'; // Fixed: Changed from AdminIcon
import { useToast } from '../../../components/ui/Toast';

const InviteClient = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    company_name: '',
    company_website: '',
    industry: '',
    client_type: 'standard',
    billing_cycle: 'monthly',
    send_welcome_email: true,
    personal_message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user (inviter)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inviter } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single();

      // Check if user already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Check error:', checkError);
        throw checkError;
      }

      if (existingProfile) {
        toast.error('A user with this email already exists');
        setLoading(false);
        return;
      }

      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      // Create the invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('client_invitations')
        .insert({
          email: formData.email,
          invited_by: inviter.id,
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          metadata: {
            full_name: formData.full_name,
            company_name: formData.company_name,
            company_website: formData.company_website,
            industry: formData.industry,
            client_type: formData.client_type,
            billing_cycle: formData.billing_cycle,
            personal_message: formData.personal_message,
            invited_by_name: inviter.full_name
          }
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Generate invite link
      const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;

      // Always copy to clipboard
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success('Invitation created! Link copied to clipboard.');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
        window.prompt('Copy this invitation link:', inviteUrl);
      }

      // Handle success flow based on email preference
      if (!formData.send_welcome_email) {
        // Manual sharing flow
        const shouldContinue = window.confirm(
          `Invitation created!\n\nInvite Link:\n${inviteUrl}\n\nCopy this link and send it to ${formData.email}\n\nAdd another client?`
        );
        
        if (shouldContinue) {
          // Reset form for another invitation
          setFormData({
            email: '',
            full_name: '',
            company_name: '',
            company_website: '',
            industry: '',
            client_type: 'standard',
            billing_cycle: 'monthly',
            send_welcome_email: true,
            personal_message: ''
          });
        } else {
          navigate('/clients');
        }
      } else {
        // Auto email selected - show link for manual sending (temporary until email service is set up)
        alert(
          `Invitation created successfully!\n\n` +
          `Please email this link to ${formData.email}:\n${inviteUrl}\n\n` +
          `(The link has been copied to your clipboard)`
        );
        
        setTimeout(() => {
          navigate('/clients');
        }, 1500);
      }

    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/clients')}
          iconName="ArrowLeft"
        >
          Back to Clients
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-heading-bold uppercase">Invite New Client</h1>
          <p className="text-gray-600 mt-2">
            Send an invitation for a client to access their portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="font-medium mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="client@company.com"
              />
              
              <Input
                label="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="John Smith"
              />
            </div>
          </div>

          {/* Company Information */}
          <div>
            <h3 className="font-medium mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                placeholder="Acme Corporation"
              />
              
              <Input
                label="Company Website"
                type="url"
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                placeholder="https://example.com"
              />
              
              <div>
                <label className="block text-sm font-medium mb-2">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
                  required
                >
                  <option value="">Select Industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="education">Education</option>
                  <option value="nonprofit">Non-Profit</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div>
            <h3 className="font-medium mb-4">Account Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Type</label>
                <select
                  value={formData.client_type}
                  onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Billing Cycle</label>
                <select
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="project">Per Project</option>
                </select>
              </div>
            </div>
          </div>

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={formData.personal_message}
              onChange={(e) => setFormData({ ...formData, personal_message: e.target.value })}
              className="w-full h-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
              placeholder="Add a personal welcome message to include in the invitation email..."
            />
          </div>

          {/* Email Option */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="send_welcome_email"
              checked={formData.send_welcome_email}
              onChange={(e) => setFormData({ ...formData, send_welcome_email: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="send_welcome_email" className="text-sm">
              Send invitation email automatically (currently manual)
            </label>
          </div>

          {!formData.send_welcome_email && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Icon name="AlertTriangle" size={20} className="text-yellow-600 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-800">
                    The invitation link will be generated and copied to your clipboard.
                    You'll need to send it to the client manually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Icon name="Info" size={20} className="text-blue-600 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800">
                  Note: Automatic email sending will be available once email service is configured. 
                  For now, the invitation link will be copied to your clipboard for manual sending.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/clients')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={loading}
              disabled={loading}
              className="bg-accent hover:bg-accent/90"
            >
              Create Invitation
            </Button>
          </div>
        </form>
      </div>

      {/* Recent Invitations */}
      <div className="mt-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/clients/invitations')}
          iconName="Clock"
        >
          View All Invitations
        </Button>
      </div>
    </div>
  );
};

export default InviteClient;