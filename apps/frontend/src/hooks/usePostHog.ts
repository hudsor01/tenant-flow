import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'
import type { User } from '@tenantflow/shared'

interface SignupEventProperties {
	method: 'google' | 'email'
	email: string
	name?: string
	user_agent?: string
	referrer?: string
}

interface LeaseGeneratorEventProperties {
	state?: string
	step?: string
	lease_type?: string
	property_count?: number
}

interface PricingEventProperties {
	plan: string
	billing_cycle: 'MONTHLY' | 'ANNUAL'
	source?: string
}

export function useAnalytics() {
	const posthog = usePostHog()

	const trackSignup = useCallback(
		(properties: SignupEventProperties) => {
			posthog?.capture('user_signed_up', {
				...properties,
				timestamp: new Date().toISOString(),
				page_url: window.location.href,
				page_title: document.title
			})
		},
		[posthog]
	)

	const trackLogin = useCallback(
		(properties: Pick<SignupEventProperties, 'method' | 'email'>) => {
			posthog?.capture('user_logged_in', {
				...properties,
				timestamp: new Date().toISOString(),
				page_url: window.location.href
			})
		},
		[posthog]
	)

	const trackLeaseGenerator = useCallback(
		(event: string, properties?: LeaseGeneratorEventProperties) => {
			posthog?.capture(`lease_generator_${event}`, {
				...properties,
				timestamp: new Date().toISOString(),
				page_url: window.location.href
			})
		},
		[posthog]
	)

	const trackPricing = useCallback(
		(event: string, properties?: PricingEventProperties) => {
			posthog?.capture(`pricing_${event}`, {
				...properties,
				timestamp: new Date().toISOString(),
				page_url: window.location.href
			})
		},
		[posthog]
	)

	const trackSubscription = useCallback(
		(
			event: string,
			properties?: { plan?: string; amount?: number; currency?: string }
		) => {
			posthog?.capture(`subscription_${event}`, {
				...properties,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const identifyUser = useCallback(
		(user: User) => {
			posthog?.identify(user.id, {
				email: user.email,
				name: user.name,
				created_at: user.createdAt
			})
		},
		[posthog]
	)

	const trackPageView = useCallback(
		(path?: string) => {
			posthog?.capture('$pageview', {
				$current_url: path || window.location.href,
				$pathname: path || window.location.pathname,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackFeatureUsage = useCallback(
		(
			feature: string,
			properties?: Record<string, string | number | boolean>
		) => {
			posthog?.capture('feature_used', {
				feature_name: feature,
				...properties,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	return {
		posthog,
		trackSignup,
		trackLogin,
		trackLeaseGenerator,
		trackPricing,
		trackSubscription,
		identifyUser,
		trackPageView,
		trackFeatureUsage
	}
}
