// src/components/ProtectedRoute.jsx - Admin Portal Version
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ProtectedRoute = ({ children, session, requiredRoles = ['admin', 'contributor', 'client_manager'] }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkAuthorization();
  }, [session, requiredRoles]);

  const checkAuthorization = async () => {
    try {
      let currentSession = session;
      
      if (!currentSession) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        currentSession = authSession;
      }
      
      if (!currentSession) {
        setLoading(false);
        setAuthorized(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', currentSession.user.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        setAuthorized(false);
        return;
      }

      setUserProfile(profile);
      setUserRole(profile.role);

      // Admin portal only allows admin, contributor, client_manager roles
      if (profile.role === 'standard') {
        // Client users should go to client portal
        setAuthorized(false);
        window.location.href = 'https://app.rule27design.com';
        return;
      }

      // Check if user has required role
      const hasRequiredRole = requiredRoles.includes(profile.role);
      
      // Check if onboarding is completed (unless on setup-profile page)
      if (!profile.onboarding_completed && !window.location.pathname.includes('setup-profile')) {
        setAuthorized(false);
      } else {
        setAuthorized(hasRequiredRole);
      }
    } catch (error) {
      console.error('Authorization error:', error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    if (!session) {
      return <Navigate to="/login" replace />;
    } else if (!userProfile?.onboarding_completed) {
      return <Navigate to="/setup-profile" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return React.cloneElement(children, { userProfile, setUserProfile });
};

export default ProtectedRoute;