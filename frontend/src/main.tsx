import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import App from '@/App';
import '@/index.css';
import '@/styles/blog.css';
import { logStripeConfigStatus } from '@/lib/stripe-config';
import { memoryMonitor } from '@/utils/memoryMonitor';
import { initFacebookPixel } from '@/lib/facebook-pixel';
import { initGTM } from '@/lib/google-tag-manager';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
          return false;
        }
        return failureCount < 3;
      },
      // Add memory optimization
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Prevent mutation caching to reduce memory usage
      gcTime: 0,
    },
  },
});

// Initialize PostHog
if (typeof window !== 'undefined') {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
  
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false, // Disable automatic pageview capture, we'll do it manually
      capture_pageleave: true,
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug();
      }
    });
  }
  
  // Initialize Facebook Pixel
  initFacebookPixel();
  
  // Initialize Google Tag Manager
  initGTM();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

// Log Stripe configuration status in development
logStripeConfigStatus();

// Start memory monitoring in development
if (import.meta.env.DEV) {
  memoryMonitor.start(10000); // Monitor every 10 seconds in development
  console.log('🔍 Memory monitoring enabled in development mode');
}

root.render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          <SpeedInsights />
        </QueryClientProvider>
      </BrowserRouter>
    </PostHogProvider>
  </React.StrictMode>
);