'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export default function PostHogClientProvider({
	children
}: {
	children: React.ReactNode
}) {
	useEffect(() => {
		// Initialize PostHog only on the client side in useEffect
		if (
			typeof window !== 'undefined' &&
			process.env.NEXT_PUBLIC_POSTHOG_KEY &&
			!posthog.__loaded
		) {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
				api_host:
					process.env.NEXT_PUBLIC_POSTHOG_HOST || (() => {
						throw new Error('NEXT_PUBLIC_POSTHOG_HOST is required for PostHog initialization')
					})(),
				capture_pageview: false,
				person_profiles: 'identified_only',
				persistence: 'localStorage+cookie',
				session_recording: {
					maskAllInputs: false,
					maskInputOptions: { password: true }
				}
			})

			// Expose PostHog on window for logger integration
			;(window as typeof window & { posthog?: typeof posthog }).posthog = posthog
		}
	}, [])

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
