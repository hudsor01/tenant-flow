/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'posthog-js' {
	export interface AutocaptureConfig {
		url_allowlist?: (string | RegExp)[]
		dom_event_allowlist?: string[]
		element_allowlist?: string[]
		css_selector_allowlist?: string[]
		element_attribute_ignorelist?: string[]
		capture_copied_text?: boolean
	}

	export interface PostHogConfig {
		api_host?: string
		ui_host?: string
		autocapture?: boolean | AutocaptureConfig
		before_send?: () => void
		bootstrap?: {
			distinctID?: string
			isIdentifiedID?: string
			featureFlags?: Record<string, any>
		}
		capture_pageview?: boolean | string
		capture_pageleave?: boolean
		capture_dead_clicks?: boolean
		cross_subdomain_cookie?: boolean
		custom_blocked_useragents?: string[]
		defaults?: string
		disable_persistence?: boolean
		disable_surveys?: boolean
		disable_session_recording?: boolean
		enable_recording_console_log?: boolean
		enable_heatmaps?: boolean
		loaded?: (posthog: PostHog) => void
		mask_all_text?: boolean
		mask_all_element_attributes?: boolean
		opt_out_capturing_by_default?: boolean
		opt_out_persistence_by_default?: boolean
		persistence?:
			| 'localStorage'
			| 'sessionStorage'
			| 'cookie'
			| 'memory'
			| 'localStorage+cookie'
		property_denylist?: string[]
		person_profiles?: 'always' | 'identified_only'
		rate_limiting?: {
			events_per_second: number
			events_burst_limit: number
		}
		session_recording?: object
		session_idle_timeout_seconds?: number
		xhr_headers?: Record<string, string>
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
		set_config(config: Partial<PostHogConfig>): void
		[key: string]: any
	}

	const posthog: PostHog
	export default posthog
}

declare module 'posthog-js/react' {
	export function usePostHog(): {
		capture: (eventName: string, properties?: Record<string, any>) => void
		identify: (distinctId: string, properties?: Record<string, any>) => void
		reset: () => void
		[key: string]: any
	}
	export function PostHogProvider(props: {
		apiKey: string
		children: React.ReactNode
		options?: Record<string, any>
	}): JSX.Element
}

declare module '@radix-ui/themes' {
	export const Box: any
	export const Flex: any
	export const Container: any
	export const Grid: any
	export const Section: any
	export const Text: any
	export const Heading: any
}
