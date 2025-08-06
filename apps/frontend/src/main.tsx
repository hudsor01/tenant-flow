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

/**
 * CRITICAL WARNING: React.Children Global Assignment Bootstrap
 * 
 * ⚠️ DO NOT MODIFY THIS SECTION WITHOUT UNDERSTANDING THE CONSEQUENCES ⚠️
 * 
 * This code prevents a production-breaking error: "Cannot set properties of undefined (setting 'Children')"
 * 
 * THE PROBLEM:
 * - In production builds, React chunks can load in unpredictable order
 * - Some components try to access React.Children before React is fully initialized
 * - This causes the app to show infinite loading and never render
 * - Lighthouse scores drop from 100 to 35 due to broken functionality
 * 
 * THE SOLUTION:
 * - Force React to be globally available immediately when main.tsx loads
 * - Ensure React.Children is accessible before any component initialization
 * - Keep React in the main bundle (configured in vite.config.ts) 
 * 
 * IF YOU SEE INFINITE LOADING WITH "Preparing your workspace..." IN PRODUCTION:
 * 1. Check browser console for "Cannot set properties of undefined (setting 'Children')"
 * 2. Verify window.React and window.React.Children are available in console
 * 3. Ensure this bootstrap code runs before any component code
 * 4. Check vite.config.ts keeps React in main bundle (returns undefined for React packages)
 * 
 * MAINTENANCE NOTES:
 * - This is a critical fix for production stability
 * - React must be in main bundle, not vendor chunk (see vite.config.ts lines 87-97)
 * - Global assignment must happen immediately, not in useEffect or component lifecycle
 * - Any changes here should be thoroughly tested in production environment
 */

// CRITICAL: Initialize window.React IMMEDIATELY to prevent race conditions
if (typeof window !== 'undefined') {
  // Pre-initialize React object structure to prevent "Cannot set properties" errors
  if (!window.React) {
    window.React = {} as typeof React
  }
}

// Main bootstrap function
(function criticalReactBootstrap() {
  try {
    if (typeof window !== 'undefined') {
      // Ensure React is globally available to prevent Children undefined errors
      window.React = React
      
      // Verify React.Children is available - this is the critical property that fails
      if (!React.Children) {
        throw new Error('React.Children is undefined - React import may be incomplete')
      }
      
      // Make React.Children explicitly available globally
      Object.defineProperty(window.React, 'Children', {
        value: React.Children,
        writable: false,
        configurable: false,
        enumerable: true
      })
      
      // Prevent accidental overwrites that could break the app again
      Object.defineProperty(window, 'React', {
        value: React,
        writable: false,
        configurable: false,
        enumerable: true
      })
      
      // Bootstrap completed successfully
      window.__REACT_BOOTSTRAP_READY__ = true
      
      // Diagnostic logging for production troubleshooting
      if (import.meta.env.PROD) {
        console.warn('✅ React bootstrap complete:', {
          React: !!window.React,
          Children: !!window.React?.Children,
          version: React.version
        })
      }
    }
  } catch (error) {
    console.error('🔥 FATAL: React bootstrap failed - app will not render:', error)
    // Don't throw - let the app attempt to render and show error boundary
  }
})()

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

// Render the React app
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
  reportWebVitals(console.warn)
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
