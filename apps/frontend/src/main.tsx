// Starting import process

import * as React from 'react'

// React imported successfully

// Add React global assignment for debugging
if (typeof window !== 'undefined') {
  // Setting up window.React
  window.React = React
  // window.React setup complete
}

import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { EnvironmentCheck } from './components/error/EnvironmentCheck'
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