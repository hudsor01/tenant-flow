declare module 'posthog-js' {
	export interface PostHogConfig {
		api_host?: string
		ui_host?: string
		loaded?: (posthog: PostHog) => void
		autocapture?: boolean
		capture_pageview?: boolean
		capture_pageleave?: boolean
		disable_session_recording?: boolean
		[key: string]: unknown
	}

	export interface PostHog {
		init(apiKey: string, config?: PostHogConfig): void
		capture(eventName: string, properties?: Record<string, unknown>): void
		identify(distinctId: string, properties?: Record<string, unknown>): void
		reset(): void
		opt_out_capturing(): void
		opt_in_capturing(): void
		debug(enabled?: boolean): void
		[key: string]: unknown
	}

	const posthog: PostHog
	export default posthog
}
