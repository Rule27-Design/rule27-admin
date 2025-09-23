// src/pages/admin/SetupProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AdminIcon';
import { Checkbox } from '../../components/ui/Checkbox';
import ImageUpload from '../../components/ui/ImageUpload';
import { useToast } from '../../components/ui/Toast';

const SetupProfile = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [session, setSession] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic Info
    full_name: '',
    display_name: '',
    job_title: '',
    bio: '',
    avatar_url: '',
    
    // Professional Info
    department: [],
    expertise: [],
    linkedin_url: '',
    twitter_url: '',
    github_url: '',
    
    // Preferences
    is_public: false,
    email_notifications: true,
  });

  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    // Check if data has changed
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      setSession(session);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (profile) {
        const profileData = {
          full_name: profile.full_name || '',
          display_name: profile.display_name || '',
          job_title: profile.job_title || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          department: profile.department || [],
          expertise: profile.expertise || [],
          linkedin_url: profile.linkedin_url || '',
          twitter_url: profile.twitter_url || '',
          github_url: profile.github_url || '',
          is_public: profile.is_public || false,
          email_notifications: profile.email_notifications !== false,
        };
        
        setFormData(profileData);
        setOriginalData(profileData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Profile load error:', error);
      toast.error('Failed to load profile');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const profileData = {
        ...formData,
        department: formData.department.filter(Boolean),
        expertise: formData.expertise.filter(Boolean),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('auth_user_id', session.user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setOriginalData(formData);
      setHasChanges(false);
      
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Discard unsaved changes?')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const addArrayItem = (field) => {
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), '']
    });
  };

  const updateArrayItem = (field, index, value) => {
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const removeArrayItem = (field, index) => {
    const newArray = (formData[field] || []).filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'User' },
    { id: 'professional', label: 'Professional', icon: 'Briefcase' },
    { id: 'preferences', label: 'Preferences', icon: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading-bold uppercase">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your profile information and preferences</p>
          </div>
          {hasChanges && (
            <span className="text-sm text-orange-600 flex items-center space-x-1">
              <Icon name="AlertCircle" size={16} />
              <span>Unsaved changes</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="flex justify-center mb-6">
                <ImageUpload
                  label="Profile Photo"
                  value={formData.avatar_url}
                  onChange={(value) => setFormData({ ...formData, avatar_url: value })}
                  bucket="avatar"
                  folder="profiles"
                  accept="image/*"
                  maxSize={2 * 1024 * 1024}
                  className="max-w-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />

                <Input
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Optional display name"
                />

                <Input
                  label="Job Title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="e.g., Senior Developer"
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full h-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length} / 500 characters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Professional Tab */}
          {activeTab === 'professional' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Departments</label>
                {(formData.department || []).map((dept, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={dept}
                      onChange={(e) => updateArrayItem('department', index, e.target.value)}
                      placeholder="e.g., Development, Marketing"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('department', index)}
                    >
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('department')}
                  iconName="Plus"
                >
                  Add Department
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Areas of Expertise</label>
                {(formData.expertise || []).map((skill, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={skill}
                      onChange={(e) => updateArrayItem('expertise', index, e.target.value)}
                      placeholder="e.g., React, UI/UX Design"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('expertise', index)}
                    >
                      <Icon name="X" size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem('expertise')}
                  iconName="Plus"
                >
                  Add Expertise
                </Button>
              </div>

              <div className="space-y-4">
                <Input
                  label="LinkedIn URL"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />

                <Input
                  label="Twitter/X URL"
                  value={formData.twitter_url}
                  onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                  placeholder="https://twitter.com/username"
                />

                <Input
                  label="GitHub URL"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Checkbox
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  label="Make my profile public"
                  description="Show your profile on the team page"
                />

                <Checkbox
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                  label="Email notifications"
                  description="Receive email updates about important activities"
                />
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Account Security</h3>
                <Button
                  variant="outline"
                  onClick={() => navigate('/reset-password')}
                  iconName="Lock"
                >
                  Change Password
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            loading={saving}
            disabled={saving || !hasChanges}
            className="bg-accent hover:bg-accent/90"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupProfile;