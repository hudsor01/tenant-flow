import React from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { EnvironmentCheck } from './components/error/EnvironmentCheck'
import './index.css'


// Initialize PostHog for analytics
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Create root element
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// Check for environment variables first
const envCheck = <EnvironmentCheck />

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {envCheck || (
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
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)