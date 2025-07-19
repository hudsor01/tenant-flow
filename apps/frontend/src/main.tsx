import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/api'
import { PostHogProvider } from 'posthog-js/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { posthog } from './lib/posthog'
import { initGTM } from './lib/google-tag-manager'
import { logStripeConfigStatus } from './lib/stripe-config'
import { memoryMonitor } from './utils/memoryMonitor'
import { Router } from './router'
import { StripeProvider } from './providers/StripeProvider'
import './index.css'

// Initialize analytics
if (typeof window !== 'undefined') {
	const posthogKey = import.meta.env.VITE_POSTHOG_KEY
	const posthogHost =
		import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

	// Only initialize PostHog in production or when explicitly configured
	if (posthogKey && !import.meta.env.DEV) {
		posthog.init(posthogKey, {
			api_host: posthogHost,
			person_profiles: 'identified_only',
			capture_pageview: false,
			capture_pageleave: true,
			disable_session_recording: true,
			bootstrap: {
				distinctID: crypto.randomUUID()
			},
			loaded: (posthog: { debug: () => void }) => {
				if (import.meta.env.DEV) posthog.debug()
			}
		})
	}

	// Only initialize other analytics in production
	if (!import.meta.env.DEV) {
		initGTM()
	}
}

// Log Stripe config status
logStripeConfigStatus()

// Start memory monitoring in dev
if (import.meta.env.DEV) {
	memoryMonitor.start(10000)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<PostHogProvider client={posthog}>
			<QueryClientProvider client={queryClient}>
				<StripeProvider>
					<Router />
					<SpeedInsights />
				</StripeProvider>
			</QueryClientProvider>
		</PostHogProvider>
	</React.StrictMode>
)
