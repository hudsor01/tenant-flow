import React from 'react'
import ReactDOM from 'react-dom/client'
import { Router } from './router'
import { TrpcProvider } from './providers/TrpcProvider'
import { StripeProvider } from './providers/StripeProvider'
import { PostHogProvider } from 'posthog-js/react'
import './index.css'

// Initialize PostHog for analytics
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Create root element
const rootElement = document.getElementById('root')!

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <TrpcProvider>
      <StripeProvider>
        {posthogKey ? (
          <PostHogProvider
            apiKey={posthogKey}
            options={{
              api_host: posthogHost,
              person_profiles: 'identified_only',
              capture_pageview: false, // We'll handle this in PageTracker
              capture_pageleave: true,
            }}
          >
            <Router />
          </PostHogProvider>
        ) : (
          <Router />
        )}
      </StripeProvider>
    </TrpcProvider>
  </React.StrictMode>,
)