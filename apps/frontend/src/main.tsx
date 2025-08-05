import React from 'react'

if (typeof window !== 'undefined' && typeof React !== 'undefined') {
  window.React = React
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

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element not found!')
  throw new Error('Root element not found')
}

export function App() {
  
  const envCheckResult = EnvironmentCheck()
  
  if (envCheckResult) {
    return envCheckResult
  }

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

try {
  const root = ReactDOM.createRoot(rootElement)
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )

} catch (error) {
  console.error('Failed to render app:', error)
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
  throw error
}
