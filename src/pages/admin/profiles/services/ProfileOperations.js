// src/pages/admin/profiles/services/ProfileOperations.js
import { supabase } from '../../../../lib/supabase';

class ProfileOperationsService {
  // Create profile
  async create(profileData, userProfile) {
    try {
      const validColumns = [
        'email', 'full_name', 'display_name', 'avatar_url', 'bio',
        'role', 'is_public', 'is_active', 'department', 'expertise',
        'job_title', 'linkedin_url', 'twitter_url', 'github_url',
        'sort_order', 'email_notifications', 'onboarding_completed'
      ];

      const cleanData = {};
      validColumns.forEach(column => {
        if (profileData[column] !== undefined) {
          cleanData[column] = profileData[column];
        }
      });

      // Ensure proper data types
      cleanData.department = Array.isArray(cleanData.department) 
        ? cleanData.department.filter(Boolean) 
        : [];

      cleanData.expertise = Array.isArray(cleanData.expertise) 
        ? cleanData.expertise.filter(Boolean) 
        : [];

      // Set defaults for booleans
      cleanData.is_public = cleanData.is_public === true;
      cleanData.is_active = cleanData.is_active !== false;
      cleanData.email_notifications = cleanData.email_notifications !== false;
      cleanData.onboarding_completed = cleanData.onboarding_completed === true;

      // Ensure sort_order is an integer
      cleanData.sort_order = parseInt(cleanData.sort_order) || 0;

      // Handle empty strings as null
      ['display_name', 'avatar_url', 'bio', 'job_title', 'linkedin_url', 'twitter_url', 'github_url'].forEach(field => {
        if (cleanData[field] === '') {
          cleanData[field] = null;
        }
      });

      // Handle invitation
      if (profileData.send_invite) {
        const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
          email: profileData.email,
          options: {
            data: {
              full_name: profileData.full_name,
              role: profileData.role,
              invited_by: userProfile.full_name,
              first_login: true,
              has_password: false
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            shouldCreateUser: true
          }
        });

        if (authError) throw authError;
        
        return { 
          success: true, 
          data: null,
          message: `Invitation sent to ${profileData.email}`
        };
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert(cleanData)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Update profile - FIXED with RLS handling
  async update(profileId, profileData, userProfile) {
    try {
      // First, verify the profile exists and we can access it
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (fetchError) {
        console.error('Cannot fetch profile to update:', fetchError);
        if (fetchError.code === 'PGRST116') {
          return { 
            success: false, 
            error: 'Profile not found or you do not have permission to edit it' 
          };
        }
        throw fetchError;
      }

      if (!existingProfile) {
        return { 
          success: false, 
          error: 'Profile not found' 
        };
      }

      // Only include columns that can be updated
      const validColumns = [
        'full_name', 'display_name', 'avatar_url', 'bio',
        'is_public', 'is_active', 'department', 'expertise',
        'job_title', 'linkedin_url', 'twitter_url', 'github_url',
        'sort_order', 'email_notifications', 'onboarding_completed'
      ];

      const updateData = {};
      validColumns.forEach(column => {
        if (profileData[column] !== undefined) {
          updateData[column] = profileData[column];
        }
      });

      // Ensure arrays are properly formatted
      if ('department' in updateData) {
        if (!updateData.department || !Array.isArray(updateData.department)) {
          updateData.department = [];
        } else {
          updateData.department = updateData.department.filter(Boolean);
        }
      }
      
      if ('expertise' in updateData) {
        if (!updateData.expertise || !Array.isArray(updateData.expertise)) {
          updateData.expertise = [];
        } else {
          updateData.expertise = updateData.expertise.filter(Boolean);
        }
      }

      // Ensure booleans are actually booleans
      ['is_public', 'is_active', 'email_notifications', 'onboarding_completed'].forEach(field => {
        if (field in updateData) {
          updateData[field] = Boolean(updateData[field]);
        }
      });

      // Ensure sort_order is an integer
      if ('sort_order' in updateData) {
        updateData.sort_order = parseInt(updateData.sort_order) || 0;
      }

      // Handle empty strings as null for optional text fields
      ['display_name', 'avatar_url', 'bio', 'job_title', 'linkedin_url', 'twitter_url', 'github_url'].forEach(field => {
        if (field in updateData && updateData[field] === '') {
          updateData[field] = null;
        }
      });

      // Only set updated_by if we have userProfile and it's not the same user
      // Some RLS policies might prevent updating your own updated_by field
      if (userProfile?.id && profileId !== userProfile.id) {
        updateData.updated_by = userProfile.id;
      }

      console.log('Updating profile:', profileId, 'with data:', updateData);

      // Use a simpler update without select() first to see if it works
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Now fetch the updated profile separately
      const { data: updatedProfile, error: refetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (refetchError) {
        console.warn('Could not refetch updated profile:', refetchError);
        // Update succeeded but we couldn't fetch the result
        return { success: true, data: { ...existingProfile, ...updateData } };
      }

      return { success: true, data: updatedProfile };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Update role
  async updateRole(profileId, newRole, reason, userProfile) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;

      const updateData = { 
        role: newRole
      };

      if (userProfile?.id && profileId !== userProfile.id) {
        updateData.updated_by = userProfile.id;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      // Log the role change (if audit_logs table exists)
      try {
        await supabase
          .from('audit_logs')
          .insert({
            action: 'role_change',
            table_name: 'profiles',
            record_id: profileId,
            old_value: { role: profile.role },
            new_value: { role: newRole },
            reason: reason,
            performed_by: userProfile.id
          });
      } catch (auditError) {
        console.log('Audit log not available:', auditError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating role:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete profile
  async delete(profileId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk update status
  async bulkUpdateStatus(profileIds, isActive, userProfile) {
    try {
      const updateData = { 
        is_active: Boolean(isActive)
      };

      if (userProfile?.id) {
        updateData.updated_by = userProfile.id;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .in('id', profileIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk updating status:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk update visibility
  async bulkUpdateVisibility(profileIds, isPublic, userProfile) {
    try {
      const updateData = { 
        is_public: Boolean(isPublic)
      };

      if (userProfile?.id) {
        updateData.updated_by = userProfile.id;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .in('id', profileIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk updating visibility:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk delete
  async bulkDelete(profileIds, userProfile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk deleting:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset
  async sendPasswordReset(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error sending reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get departments
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Return empty array if departments table doesn't exist
      return { success: true, data: [] };
    }
  }

  // Export profiles
  async exportProfiles(profileIds = null, format = 'csv') {
    try {
      let query = supabase
        .from('profiles')
        .select('*');

      if (profileIds) {
        query = query.in('id', profileIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const csv = this.convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profiles-export-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting profiles:', error);
      return { success: false, error: error.message };
    }
  }

  // Get statistics
  async getStatistics(dateRange = null) {
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      if (dateRange) {
        if (dateRange.start) {
          query = query.gte('created_at', dateRange.start);
        }
        if (dateRange.end) {
          query = query.lte('created_at', dateRange.end);
        }
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      const stats = {
        total: count || 0,
        byRole: {},
        byDepartment: {},
        public: 0,
        active: 0,
        withLogin: 0
      };
      
      data.forEach(profile => {
        // Role breakdown
        stats.byRole[profile.role] = (stats.byRole[profile.role] || 0) + 1;
        
        // Department breakdown
        if (profile.department && profile.department.length > 0) {
          profile.department.forEach(dept => {
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
          });
        }
        
        // Status counts
        if (profile.is_public) stats.public++;
        if (profile.is_active) stats.active++;
        if (profile.auth_user_id) stats.withLogin++;
      });
      
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Convert to CSV
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = ['Name', 'Email', 'Role', 'Department', 'Job Title', 'Active', 'Public', 'Created'];
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(profile => {
      const row = [
        this.escapeCSV(profile.full_name),
        this.escapeCSV(profile.email),
        this.escapeCSV(profile.role),
        this.escapeCSV(profile.department?.join('; ') || ''),
        this.escapeCSV(profile.job_title || ''),
        profile.is_active ? 'Yes' : 'No',
        profile.is_public ? 'Yes' : 'No',
        new Date(profile.created_at).toLocaleDateString()
      ];
      return row.join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // Escape CSV values
  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }
}

export const profileOperations = new ProfileOperationsService();