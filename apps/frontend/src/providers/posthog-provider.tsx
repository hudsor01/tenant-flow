'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

export default function PostHogClientProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		// Initialize PostHog only on the client side in useEffect
		if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && !posthog.__loaded) {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
				api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
				capture_pageview: false, // We'll handle this manually for App Router
				person_profiles: 'identified_only',
				persistence: 'localStorage+cookie',
				session_recording: {
					maskAllInputs: false,
					maskInputOptions: { password: true }
				}
			})
		}
	}, [])

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}