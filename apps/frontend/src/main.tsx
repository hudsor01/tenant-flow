import React from 'react'

// CRITICAL: Ensure React is available globally IMMEDIATELY after import
// This must happen before any other imports that might use React.Children
if (typeof window !== 'undefined' && typeof React !== 'undefined') {
  window.React = React
  // Ensure React.Children is explicitly available
  if (React.Children && !window.React.Children) {
    window.React.Children = React.Children
  }
}

import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { EnvironmentCheck } from './components/error/EnvironmentCheck'
import './index.css'

// Log initialization info in development only
if (import.meta.env.DEV) {
  console.warn('TenantFlow Frontend Initializing...', {
    mode: import.meta.env.MODE,
    baseUrl: import.meta.env.BASE_URL,
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasApiUrl: !!import.meta.env.VITE_API_BASE_URL,
  })
}


// Initialize PostHog for analytics
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Create root element
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// Create a wrapper component that handles environment check
export function App() {
  const envCheckResult = EnvironmentCheck()
  
  // If environment check returns something (error), show it
  if (envCheckResult) {
    return envCheckResult
  }
  
  // Otherwise render the app
  return (
    <QueryProvider>
      <StripeProvider>
        {posthogKey ? (
          <PostHogProvider
            apiKey={posthogKey}
            options={{
              api_host: posthogHost,
              person_profiles: 'identified_only',
              capture_pageview: false,
              capture_pageleave: true,
            }}
          >
            <Router />
          </PostHogProvider>
        ) : (
          <Router />
        )}
      </StripeProvider>
    </QueryProvider>
  )
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)