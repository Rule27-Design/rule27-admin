// src/Routes.jsx
import React, { useEffect } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, useNavigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";

// Import event systems for all admin modules
import { useArticleEvents, ARTICLE_EVENTS } from './pages/admin/articles/hooks/useArticleEvents';
import { useCaseStudyEvents, CASE_STUDY_EVENTS } from './pages/admin/case-studies/hooks/useCaseStudyEvents';
import { useServiceEvents, SERVICE_EVENTS } from './pages/admin/services/hooks/useServiceEvents';
import { useProfileEvents, PROFILE_EVENTS } from './pages/admin/profiles/hooks/useProfileEvents';
import { useSettingsEvents } from './pages/admin/settings/hooks/useSettingsEvents';

// Public Pages
import HomepageExperienceHub from './pages/homepage-experience-hub';
import CapabilityUniverse from './pages/capability-universe';
import InnovationLaboratory from './pages/innovation-laboratory';
import WorkShowcaseTheater from './pages/work-showcase-theater';
import CaseStudyDetail from './pages/case-study-detail';
import ArticlesHub from './pages/articles-hub';
import AboutProcessStudio from './pages/about-process-studio';
import ContactConsultationPortal from './pages/contact-consultation-portal';
import AcceptInvite from './pages/AcceptInvite';

// Auth Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetupProfile from './pages/admin/SetupProfile';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminServices from './pages/admin/services/Services';
import AdminArticles from './pages/admin/articles/Articles';
import AdminCaseStudies from './pages/admin/case-studies/CaseStudies';
import AdminProfiles from './pages/admin/profiles/Profiles';
import AdminSettings from './pages/admin/settings/Settings';
import AdminLeads from './pages/admin/Leads';
import AdminAnalytics from './pages/admin/Analytics';
import AdminClients from './pages/admin/clients/Clients';
import InviteClient from './pages/admin/clients/InviteClient';
import ClientInvitations from './pages/admin/clients/Invitations';
import ClientDetail from './pages/admin/clients/ClientDetail';
import EditClient from './pages/admin/clients/EditClient';

// Client Pages
import ClientLayout from './pages/client/ClientLayout';
import ClientDashboard from './pages/client/Dashboard';
import ClientProjects from './pages/client/Projects';
import ClientInvoices from './pages/client/Invoices';
import ClientSupport from './pages/client/Support';
import ClientProfile from './pages/client/Profile';
import ClientSetupProfile from './pages/client/ClientSetupProfile';

// Utils
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';

// Auth Callback Component with Event Integration and Role-Based Routing
const AuthCallback = () => {
  const navigate = useNavigate();
  const { emit: emitArticle } = useArticleEvents();
  const { emit: emitCaseStudy } = useCaseStudyEvents();
  const { emit: emitService } = useServiceEvents();
  const { emit: emitProfile } = useProfileEvents();
  const { emit: emitSettings } = useSettingsEvents();

  React.useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Emit authentication start events to all modules
      emitArticle('auth:callback_started', { timestamp: Date.now() });
      emitCaseStudy('auth:callback_started', { timestamp: Date.now() });
      emitService('auth:callback_started', { timestamp: Date.now() });
      emitProfile('auth:callback_started', { timestamp: Date.now() });
      emitSettings('auth:callback_started', { timestamp: Date.now() });

      // Get the session from the URL
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        emitArticle('auth:callback_failed', { error: error.message });
        emitCaseStudy('auth:callback_failed', { error: error.message });
        emitService('auth:callback_failed', { error: error.message });
        emitProfile('auth:callback_failed', { error: error.message });
        emitSettings('auth:callback_failed', { error: error.message });
        navigate('/login');
        return;
      }
      
      if (session) {
        console.log('Session found for:', session.user.email);
        
        // Emit successful authentication events
        const authData = { 
          userId: session.user.id, 
          email: session.user.email 
        };
        emitArticle('auth:session_found', authData);
        emitCaseStudy('auth:session_found', authData);
        emitService('auth:session_found', authData);
        emitProfile('auth:session_found', authData);
        emitSettings('auth:session_found', authData);
        
        // Wait a moment for the trigger to create/update the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check user profile and role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }
        
        // If no profile exists, create one
        if (!profile) {
          console.log('Creating profile for new user');
          const profileCreatingData = { userId: session.user.id };
          emitArticle('auth:profile_creating', profileCreatingData);
          emitCaseStudy('auth:profile_creating', profileCreatingData);
          emitService('auth:profile_creating', profileCreatingData);
          emitProfile('auth:profile_creating', profileCreatingData);
          emitSettings('auth:profile_creating', profileCreatingData);
          
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
            const errorData = { 
              userId: session.user.id, 
              error: createError.message 
            };
            emitArticle('auth:profile_creation_failed', errorData);
            emitCaseStudy('auth:profile_creation_failed', errorData);
            emitService('auth:profile_creation_failed', errorData);
            emitProfile('auth:profile_creation_failed', errorData);
            emitSettings('auth:profile_creation_failed', errorData);
            
            // Try to fetch existing profile by email
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
              
              const linkedData = { profileId: existingProfile.id };
              emitArticle('auth:profile_linked', linkedData);
              emitCaseStudy('auth:profile_linked', linkedData);
              emitService('auth:profile_linked', linkedData);
              emitProfile('auth:profile_linked', linkedData);
              emitSettings('auth:profile_linked', linkedData);
              handleNavigation(session, existingProfile);
            } else {
              navigate('/login');
            }
          } else {
            const createdData = { profileId: newProfile.id };
            emitArticle('auth:profile_created', createdData);
            emitCaseStudy('auth:profile_created', createdData);
            emitService('auth:profile_created', createdData);
            emitProfile('auth:profile_created', createdData);
            emitSettings('auth:profile_created', createdData);
            handleNavigation(session, newProfile);
          }
        } else {
          const foundData = { profileId: profile.id, role: profile.role };
          emitArticle('auth:profile_found', foundData);
          emitCaseStudy('auth:profile_found', foundData);
          emitService('auth:profile_found', foundData);
          emitProfile('auth:profile_found', foundData);
          emitSettings('auth:profile_found', foundData);
          handleNavigation(session, profile);
        }
      } else {
        console.log('No session found');
        const noSessionData = {};
        emitArticle('auth:no_session', noSessionData);
        emitCaseStudy('auth:no_session', noSessionData);
        emitService('auth:no_session', noSessionData);
        emitProfile('auth:no_session', noSessionData);
        emitSettings('auth:no_session', noSessionData);
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      const errorData = { error: error.message };
      emitArticle('auth:callback_error', errorData);
      emitCaseStudy('auth:callback_error', errorData);
      emitService('auth:callback_error', errorData);
      emitProfile('auth:callback_error', errorData);
      emitSettings('auth:callback_error', errorData);
      navigate('/login');
    }
  };

  const handleNavigation = async (session, profile) => {
    const userData = session.user.user_metadata;
    const hasPassword = userData?.has_password === true;
    const isFirstLogin = userData?.first_login !== false;
    const profileCompleted = profile.onboarding_completed === true;
    
    console.log('Navigation decision:', {
      hasPassword,
      isFirstLogin,
      profileCompleted,
      role: profile.role
    });

    // Emit navigation decision events
    const navData = {
      userId: session.user.id,
      profileId: profile.id,
      hasPassword,
      isFirstLogin,
      profileCompleted,
      role: profile.role
    };
    emitArticle('auth:navigation_decision', navData);
    emitCaseStudy('auth:navigation_decision', navData);
    emitService('auth:navigation_decision', navData);
    emitProfile('auth:navigation_decision', navData);
    emitSettings('auth:navigation_decision', navData);
    
    // Route based on role and onboarding status
    if (!profileCompleted) {
      // Route to appropriate setup based on role
      if (profile.role === 'standard') {
        console.log('Redirecting to client profile setup');
        navigate('/client/setup-profile');
      } else {
        console.log('Redirecting to admin profile setup');
        navigate('/setup-profile');
      }
    } else if (profile.role === 'admin' || profile.role === 'contributor' || profile.role === 'client_manager') {
      console.log('Redirecting to admin dashboard');
      navigate('/admin');
    } else if (profile.role === 'standard') {
      console.log('Redirecting to client portal');
      navigate('/client');
    } else {
      console.log('Unknown role, redirecting to home');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        <p className="mt-4 text-gray-600">Authenticating...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait...</p>
      </div>
    </div>
  );
};

// Enhanced Routes Component with Event Integration for all modules
const Routes = ({ session }) => {
  const { emit: emitArticle, subscribeToEvents: subscribeArticle } = useArticleEvents();
  const { emit: emitCaseStudy, subscribeToEvents: subscribeCaseStudy } = useCaseStudyEvents();
  const { emit: emitService, subscribeToEvents: subscribeService } = useServiceEvents();
  const { emit: emitProfile, subscribeToEvents: subscribeProfile } = useProfileEvents();
  const { emit: emitSettings, subscribeToEvents: subscribeSettings } = useSettingsEvents();

  // Set up global route change tracking
  useEffect(() => {
    // Track route changes for analytics
    const handleRouteChange = () => {
      const routeData = {
        path: window.location.pathname,
        timestamp: Date.now(),
        session: session?.user?.id || null
      };
      emitArticle('navigation:route_changed', routeData);
      emitCaseStudy('navigation:route_changed', routeData);
      emitService('navigation:route_changed', routeData);
      emitProfile('navigation:route_changed', routeData);
      emitSettings('navigation:route_changed', routeData);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Emit initial route
    handleRouteChange();

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [emitArticle, emitCaseStudy, emitService, emitProfile, emitSettings, session]);

  // Set up session change tracking
  useEffect(() => {
    if (session) {
      const sessionData = {
        userId: session.user.id,
        email: session.user.email,
        timestamp: Date.now()
      };
      emitArticle('session:established', sessionData);
      emitCaseStudy('session:established', sessionData);
      emitService('session:established', sessionData);
      emitProfile('session:established', sessionData);
      emitSettings('session:established', sessionData);
    } else {
      const clearedData = {
        timestamp: Date.now()
      };
      emitArticle('session:cleared', clearedData);
      emitCaseStudy('session:cleared', clearedData);
      emitService('session:cleared', clearedData);
      emitProfile('session:cleared', clearedData);
      emitSettings('session:cleared', clearedData);
    }
  }, [session, emitArticle, emitCaseStudy, emitService, emitProfile, emitSettings]);

  // Set up global error handling for admin routes
  useEffect(() => {
    const unsubscribeArticle = subscribeArticle('admin:error', (error) => {
      console.error('Admin error detected (articles):', error);
    });

    const unsubscribeCaseStudy = subscribeCaseStudy('admin:error', (error) => {
      console.error('Admin error detected (case studies):', error);
    });

    const unsubscribeService = subscribeService('admin:error', (error) => {
      console.error('Admin error detected (services):', error);
    });

    const unsubscribeProfile = subscribeProfile('admin:error', (error) => {
      console.error('Admin error detected (profiles):', error);
    });

    const unsubscribeSettings = subscribeSettings('admin:error', (error) => {
      console.error('Admin error detected (settings):', error);
    });

    return () => {
      unsubscribeArticle();
      unsubscribeCaseStudy();
      unsubscribeService();
      unsubscribeProfile();
      unsubscribeSettings();
    };
  }, [subscribeArticle, subscribeCaseStudy, subscribeService, subscribeProfile, subscribeSettings]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public Routes */}
          <Route path="/" element={<HomepageExperienceHub />} />
          <Route path="/capabilities" element={<CapabilityUniverse />} />
          <Route path="/innovation" element={<InnovationLaboratory />} />
          <Route path="/work" element={<WorkShowcaseTheater />} />
          <Route path="/case-study/:slug" element={<CaseStudyDetail />} />
          <Route path="/articles" element={<ArticlesHub />} />
          <Route path="/about" element={<AboutProcessStudio />} />
          <Route path="/contact" element={<ContactConsultationPortal />} />

          {/* Add this public route for accepting invites */}
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Auth Routes - Unified Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Profile Setup Routes - Outside of layouts for full-screen experience */}
          <Route path="/setup-profile" element={<SetupProfile />} />
          <Route path="/client/setup-profile" element={
            <ProtectedRoute session={session} requiredRoles={['standard']}>
              <ClientSetupProfile />
            </ProtectedRoute>
          } />

          {/* Protected Admin Routes - For admin, contributor, and client_manager roles */}
          <Route path="/admin" element={
            <ProtectedRoute session={session} requiredRoles={['admin', 'contributor', 'client_manager']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="articles" element={<AdminArticles />} />
            <Route path="case-studies" element={<AdminCaseStudies />} />
            
            {/* Only admins can see profiles and settings */}
            <Route path="profiles" element={
              <ProtectedRoute session={session} requiredRoles={['admin']}>
                <AdminProfiles />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute session={session} requiredRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            
            {/* Admins and client managers can manage clients */}
            <Route path="clients" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
                <AdminClients />
              </ProtectedRoute>
            } />
            <Route path="clients/invite" element={
              <ProtectedRoute session={session} requiredRoles={['admin']}>
                <InviteClient />
              </ProtectedRoute>
            } />
            <Route path="clients/invitations" element={
              <ProtectedRoute session={session} requiredRoles={['admin']}>
                <ClientInvitations />
              </ProtectedRoute>
            } />
            <Route path="clients/:id" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
                <ClientDetail />
              </ProtectedRoute>
            } />
            <Route path="clients/:id/edit" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
                <EditClient />
              </ProtectedRoute>
            } />
            
            <Route path="profile" element={<SetupProfile />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          {/* Protected Client Portal Routes - For standard role (paying clients) */}
          <Route path="/client" element={
            <ProtectedRoute session={session} requiredRoles={['standard']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="invoices" element={<ClientInvoices />} />
            <Route path="support" element={<ClientSupport />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>
          
          {/* 404 - Not Found */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;