'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// Initialize PostHog only on the client side
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: '/ingest', // Use reverse proxy to avoid ad blockers
    person_profiles: 'identified_only', // Reduce costs by only tracking identified users
    capture_pageview: false, // We'll manually track pageviews for better control
    capture_pageleave: true, // Track when users leave pages
    persistence: 'localStorage+cookie', // Use both for better persistence
    autocapture: {
      // Configure autocapture settings
      capture_copied_text: false, // Don't capture copied text for privacy
      css_selector_allowlist: ['[data-track]'], // Only track elements with data-track attribute
    },
    session_recording: {
      maskAllInputs: true, // Mask all inputs for privacy
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
      },
    },
    opt_out_capturing_by_default: false,
    loaded: (posthog) => {
      // Check if we should track based on env and feature flags
      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') {
        posthog.opt_out_capturing()
      }
    },
  })
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check for Do Not Track browser setting
    if (typeof window !== 'undefined' && navigator.doNotTrack === '1') {
      posthog.opt_out_capturing()
    }
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}