import React from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { AuthProvider } from './providers/AuthProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { EnvironmentCheck } from './components/error/EnvironmentCheck'
import { WebVitalsMonitor } from './components/analytics/WebVitalsMonitor'
import reportWebVitals from './reportWebVitals'
import './index.css'

// Ensure React is globally available to prevent Children undefined errors
if (typeof window !== 'undefined') {
  window.React = React
}

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element not found!')
  throw new Error('Root element not found')
}

export function App() {
  // Check environment but don't block the app
  const envCheck = EnvironmentCheck()
  if (envCheck && import.meta.env.PROD) {
    return envCheck
  }
  
  return (
    <QueryProvider>
      <AuthProvider>
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
      </AuthProvider>
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

// Report web vitals
if (import.meta.env.DEV) {
  reportWebVitals(console.log)
} else {
  // In production, send to analytics service
  reportWebVitals((metric) => {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
  })
}
