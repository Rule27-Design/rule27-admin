// src/Routes.jsx - Admin Portal Version
import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";

// Auth Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';
import NoAccess from './pages/NoAccess';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import SetupProfile from './pages/admin/SetupProfile';

// Admin Features - Check which actually exist
import AdminServices from './pages/admin/services/Services';
import AdminArticles from './pages/admin/articles/Articles';
import AdminCaseStudies from './pages/admin/case-studies/CaseStudies';
import AdminProfiles from './pages/admin/profiles/Profiles';
import AdminSettings from './pages/admin/settings/Settings';
import AdminLeads from './pages/admin/Leads';
import AdminAnalytics from './pages/admin/Analytics';

// Client Management
import AdminClients from './pages/admin/clients/Clients';
import InviteClient from './pages/admin/clients/InviteClient';
import ClientInvitations from './pages/admin/clients/Invitations';
import ClientDetail from './pages/admin/clients/ClientDetail';
import EditClient from './pages/admin/clients/EditClient';

// Utils
import ProtectedRoute from './components/ProtectedRoute';

const Routes = ({ session }) => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/no-access" element={<NoAccess />} />
          
          {/* Admin Setup */}
          <Route path="/setup-profile" element={
            <ProtectedRoute session={session} requiredRoles={['admin', 'contributor', 'client_manager']}>
              <SetupProfile />
            </ProtectedRoute>
          } />
          
          {/* Protected Admin Routes */}
          <Route path="/" element={
            <ProtectedRoute session={session} requiredRoles={['admin', 'contributor', 'client_manager']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="articles" element={<AdminArticles />} />
            <Route path="case-studies" element={<AdminCaseStudies />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            
            {/* Admin-only routes */}
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
            
            {/* Client management - Admin and Client Manager */}
            <Route path="clients" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
                <AdminClients />
              </ProtectedRoute>
            } />
            <Route path="clients/invite" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
                <InviteClient />
              </ProtectedRoute>
            } />
            <Route path="clients/invitations" element={
              <ProtectedRoute session={session} requiredRoles={['admin', 'client_manager']}>
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
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;