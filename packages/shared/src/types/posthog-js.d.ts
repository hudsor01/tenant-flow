/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'posthog-js' {
	export interface PostHogConfig {
		api_host?: string
		ui_host?: string
		loaded?: (posthog: PostHog) => void
		autocapture?: boolean
		capture_pageview?: boolean
		capture_pageleave?: boolean
		disable_session_recording?: boolean
		[key: string]: any
	}

	export interface PostHog {
		init(apiKey: string, config?: PostHogConfig): void
		capture(eventName: string, properties?: Record<string, any>): void
		identify(distinctId: string, properties?: Record<string, any>): void
		reset(): void
		opt_out_capturing(): void
		opt_in_capturing(): void
		debug(enabled?: boolean): void
		[key: string]: any
	}

	const posthog: PostHog
	export default posthog
}

declare module 'posthog-js/react' {
	import { PostHog } from 'posthog-js'

	export function usePostHog(): PostHog
	export function PostHogProvider(props: {
		apiKey: string
		children: React.ReactNode
		options?: Record<string, any>
	}): JSX.Element
}
