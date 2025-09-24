'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

declare global {
	interface Window {
		posthog?: typeof posthog
	}
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

interface PostHogClientProviderProps {
	children: ReactNode
}

export default function PostHogClientProvider({
	children
}: PostHogClientProviderProps) {
	useEffect(() => {
		if (typeof window === 'undefined' || posthog.__loaded) {
			return
		}

		if (!POSTHOG_KEY || !POSTHOG_HOST) {
			throw new Error(
				'NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST are required for PostHog initialisation.'
			)
		}

		posthog.init(POSTHOG_KEY, {
			api_host: POSTHOG_HOST,
			capture_pageview: false,
			person_profiles: 'identified_only',
			persistence: 'localStorage+cookie',
			session_recording: {
				maskAllInputs: false,
				maskInputOptions: { password: true }
			}
		})

		window.posthog = posthog

		return () => {
			// PostHog handles cleanup internally, no explicit flush needed
		}
	}, [])

	return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
