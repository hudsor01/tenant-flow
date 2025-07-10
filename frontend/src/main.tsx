// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PostHogProvider } from 'posthog-js/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { posthog } from './lib/posthog'
import { initGTM } from './lib/google-tag-manager'
import { logStripeConfigStatus } from './lib/stripe-config'
import { memoryMonitor } from './utils/memoryMonitor'
import { initFacebookPixel } from './lib/facebook-pixel'
import './index.css'
import './styles/blog.css'
import { router } from './routes.config'

// Create a client for React Query
const queryClient = new QueryClient()

// Initialize analytics
if (typeof window !== 'undefined') {
	const posthogKey = import.meta.env.VITE_POSTHOG_KEY
	const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com '

	if (posthogKey) {
		posthog.init(posthogKey, {
			api_host: posthogHost,
			person_profiles: 'identified_only',
			capture_pageview: false,
			capture_pageleave: true,
			disable_session_recording: true,
			loaded: (posthog: { debug: () => void }) => {
				if (import.meta.env.DEV) posthog.debug()
			}
		})
	}

	initFacebookPixel()
	initGTM()
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
				<RouterProvider router={router} />
				<SpeedInsights />
			</QueryClientProvider>
		</PostHogProvider>
	</React.StrictMode>
)