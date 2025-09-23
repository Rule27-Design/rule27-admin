// src/App.jsx - Admin Portal Version
import React, { useEffect, useState } from "react";
import Routes from "./Routes";
import Hotjar from '@hotjar/browser';
import ReactGA from 'react-ga4';
import { supabase } from './lib/supabase';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { EventBusProvider } from './components/providers/EventBusProvider.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Google Analytics
    const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    if (GA_ID) {
      ReactGA.initialize(GA_ID);
    }

    // Initialize Hotjar
    const HOTJAR_ID = import.meta.env.VITE_HOTJAR_ID;
    if (HOTJAR_ID) {
      Hotjar.init(parseInt(HOTJAR_ID), 6);
    }

    // Handle Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // Clear any auth hash from URL
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      // Clear URL hash after auth
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      message="We're sorry, but something went wrong. Please refresh the page or try again later."
    >
      <ToastProvider>
        <EventBusProvider>
          <Routes session={session} />
        </EventBusProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;