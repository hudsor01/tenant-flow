// Starting import process
import React from 'react'

// CRITICAL: Ensure React is available globally IMMEDIATELY after import
// This must happen before any other imports that might use React.Children
if (typeof window !== 'undefined' && typeof React !== 'undefined') {
  // Setting up window.React
  window.React = React
  // Ensure React.Children is explicitly available
  if (React.Children && !window.React.Children) {
    window.React.Children = React.Children
  }
  // window.React setup complete
}

import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { EnvironmentCheck } from './components/error/EnvironmentCheck'
import { WebVitalsMonitor } from './components/analytics/WebVitalsMonitor'
import './index.css'

// Environment check for debugging


// Initialize PostHog for analytics
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Create root element
// Looking for root element
const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element not found!')
  throw new Error('Root element not found')
}
// Root element found

// Create a wrapper component that handles environment check
export function App() {
  // App component starting
  
  const envCheckResult = EnvironmentCheck()
  
  // If environment check returns something (error), show it
  if (envCheckResult) {
    // Environment check failed, showing error
    return envCheckResult
  }
  
  // Environment check passed, rendering app
  // Otherwise render the app
  return (
    <QueryProvider>
      <StripeProvider>
        <WebVitalsMonitor />
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

// About to create React root and render
try {
  const root = ReactDOM.createRoot(rootElement)
  // React root created successfully
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  // App rendered successfully!
} catch (error) {
  console.error('Failed to render app:', error)
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
  throw error
}