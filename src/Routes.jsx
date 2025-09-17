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
import NoAccess from './pages/NoAccess';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminServices from './pages/admin/Services';
import AdminProjects from './pages/admin/Projects';
import AdminClients from './pages/admin/clients/Clients';
import InviteClient from './pages/admin/clients/InviteClient';
import ClientInvitations from './pages/admin/clients/ClientInvitations';
import AdminReviews from './pages/admin/Reviews';
import AdminBlog from './pages/admin/Blog';
import AdminWork from './pages/admin/Work';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';
import SetupProfile from './pages/admin/SetupProfile';

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
          
          {/* Admin Portal Routes */}
          <Route path="/" element={
            <ProtectedRoute session={session} requiredRoles={['admin', 'contributor', 'client_manager']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="clients/invite" element={<InviteClient />} />
            <Route path="clients/invitations" element={<ClientInvitations />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="work" element={<AdminWork />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;