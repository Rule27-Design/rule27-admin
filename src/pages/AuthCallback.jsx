// src/pages/auth/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Icon from '../components/AppIcon';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Authenticating...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      setStatus('Processing authentication...');
      
      // Get the session from the URL hash
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Failed to establish session');
      }
      
      if (session) {
        console.log('Session established for:', session.user.email);
        setStatus('Checking profile...');
        
        // Wait a moment for the trigger to create/update the profile
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get the profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }
        
        // If no profile exists, create one (backup in case trigger failed)
        if (!profile) {
          console.log('No profile found, creating one...');
          setStatus('Setting up your profile...');
          
          const userData = session.user.user_metadata;
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              auth_user_id: session.user.id,
              email: session.user.email,
              full_name: userData?.full_name || session.user.email.split('@')[0],
              role: userData?.role || 'standard',
              is_active: true,
              is_public: false,
              onboarding_completed: false
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Profile creation error:', createError);
            // Try to fetch again in case it exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', session.user.email)
              .single();
            
            if (existingProfile) {
              // Update it to link with auth
              await supabase
                .from('profiles')
                .update({ auth_user_id: session.user.id })
                .eq('id', existingProfile.id);
              
              await handleNavigation(session, existingProfile);
            } else {
              throw new Error('Failed to create user profile');
            }
          } else {
            await handleNavigation(session, newProfile);
          }
        } else {
          await handleNavigation(session, profile);
        }
      } else {
        console.log('No session found, redirecting to login');
        navigate('/login'); // Changed from '/admin/login'
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      setError(error.message || 'Authentication failed');
      setTimeout(() => navigate('/login'), 3000); // Changed from '/admin/login'
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = async (session, profile) => {
    setStatus('Redirecting...');
    
    // Get user metadata
    const userData = session.user.user_metadata;
    
    // FLOW LOGIC:
    // 1. First check if password needs to be set (ALWAYS FIRST for new users)
    // 2. Then check if profile needs completion
    // 3. Route based on role: admin/contributor -> /admin, standard -> /client
    
    const hasPassword = userData?.has_password === true;
    const isFirstLogin = userData?.first_login !== false;
    const profileCompleted = profile.onboarding_completed === true;
    
    console.log('Navigation decision:', {
      hasPassword,
      isFirstLogin,
      profileCompleted,
      role: profile.role
    });
    
    // STEP 1: Password setup (for invited users who haven't set password)
    if (!hasPassword && isFirstLogin) {
      console.log('Redirecting to password setup');
      navigate('/admin/setup-profile?step=password');
    }
    // STEP 2: Profile setup (if password is set but profile not complete)
    else if (!profileCompleted) {
      console.log('Redirecting to profile setup');
      navigate('/admin/setup-profile?step=profile');
    }
    // STEP 3: Route based on role
    else if (profile.role === 'admin' || profile.role === 'contributor') {
      console.log('Redirecting to admin dashboard');
      navigate('/admin');
    }
    // STEP 4: Standard users go to client portal
    else if (profile.role === 'standard') {
      console.log('Redirecting to client portal');
      navigate('/client');
    }
    // STEP 5: Unknown role - redirect to home
    else {
      console.log('Unknown role, redirecting to home');
      navigate('/');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-medium text-red-900 mb-2">Authentication Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">{status}</p>
        <p className="text-sm text-gray-500 mt-2">Please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;