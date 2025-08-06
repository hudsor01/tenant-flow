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

// CRITICAL: React global bootstrap - MUST be first thing executed
// This prevents "Cannot set properties of undefined (setting 'Children')" errors
(function immediateReactBootstrap() {
  try {
    // Ensure React is immediately available globally
    if (typeof window !== 'undefined') {
      // Create a stable React reference
      const ReactRef = React
      
      // Set up window.React with defensive programming
      window.React = ReactRef
      
      // Explicitly ensure all React properties are available
      if (ReactRef.Children) {
        Object.defineProperty(window.React, 'Children', {
          value: ReactRef.Children,
          writable: false,
          configurable: false,
          enumerable: true
        })
      } else {
        // If React.Children is somehow missing, try emergency polyfill
        console.warn('🚨 React.Children missing from React import - attempting polyfill load')
        if (window.__loadReactPolyfillIfNeeded__) {
          window.__loadReactPolyfillIfNeeded__()
        }
      }
      
      // Additional React properties that might be needed
      if (ReactRef.createElement) {
        Object.defineProperty(window.React, 'createElement', {
          value: ReactRef.createElement,
          writable: false,
          configurable: false,
          enumerable: true
        })
      }
      
      if (ReactRef.Component) {
        Object.defineProperty(window.React, 'Component', {
          value: ReactRef.Component,
          writable: false,
          configurable: false,
          enumerable: true
        })
      }
      
      if (ReactRef.Fragment) {
        Object.defineProperty(window.React, 'Fragment', {
          value: ReactRef.Fragment,
          writable: false,
          configurable: false,
          enumerable: true
        })
      }
      
      // Make React immutable and non-configurable to prevent overwriting
      Object.defineProperty(window, 'React', {
        value: ReactRef,
        writable: false,
        configurable: false,
        enumerable: true
      })
      
      // Final verification before marking as ready
      if (!window.React.Children) {
        console.error('🔥 CRITICAL: React.Children still not available after all attempts')
        throw new Error('React.Children unavailable - all bootstrap attempts failed')
      }
      
      // Set bootstrap ready flag
      window.__REACT_BOOTSTRAP_READY__ = true
      
      // Debug logging for production diagnosis
      if (import.meta.env.PROD) {
        console.warn('✅ React globally available:', {
          React: !!window.React,
          Children: !!window.React?.Children,
          createElement: !!window.React?.createElement,
          timestamp: new Date().toISOString()
        })
      }
    }
  } catch (error) {
    console.error('🔥 CRITICAL: React bootstrap failed:', error)
    if (window.__REACT_ERROR_BOUNDARY__) {
      window.__REACT_ERROR_BOUNDARY__(error instanceof Error ? error : new Error(String(error)), { phase: 'React Bootstrap' })
    }
    throw error
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
  // CRITICAL: Verify React bootstrap before rendering any components
  if (typeof window !== 'undefined') {
    if (!window.__REACT_BOOTSTRAP_READY__) {
      console.error('🔥 CRITICAL: App rendering attempted before React bootstrap complete')
      throw new Error('App cannot render - React bootstrap not ready')
    }
    
    if (!window.React || !window.React.Children) {
      console.error('🔥 CRITICAL: App rendering attempted without proper React globals')
      throw new Error('App cannot render - React or React.Children not available')
    }
  }

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

// CRITICAL: Final verification before creating React root
function verifyReactBootstrapAndRender() {
  // Last chance verification that everything is ready
  if (typeof window !== 'undefined') {
    if (!window.__REACT_BOOTSTRAP_READY__) {
      throw new Error('FATAL: React bootstrap not ready at render time')
    }
    
    if (!window.React) {
      throw new Error('FATAL: window.React undefined at render time')  
    }
    
    if (!window.React.Children) {
      throw new Error('FATAL: window.React.Children undefined at render time')
    }
    
    console.warn('✅ Final React bootstrap verification passed')
  }
  
  try {
    if (!rootElement) {
      throw new Error('Root element is null - cannot create React root')
    }
    const root = ReactDOM.createRoot(rootElement)
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )

  } catch (error) {
    console.error('🔥 FAILED TO RENDER APP:', error)
    console.error('🔥 ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace available')
    console.error('🔥 REACT STATE:', {
      windowReact: !!window.React,
      reactChildren: !!(window.React && window.React.Children),
      bootstrapReady: !!window.__REACT_BOOTSTRAP_READY__
    })
    
    // Try to show error in UI instead of white screen
    if (window.__REACT_ERROR_BOUNDARY__) {
      window.__REACT_ERROR_BOUNDARY__(error instanceof Error ? error : new Error(String(error)), { phase: 'App Render' })
    }
    
    throw error
  }
}

// Execute the final verification and render
verifyReactBootstrapAndRender()

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
