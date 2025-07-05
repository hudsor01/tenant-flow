/**
 * PostHog Analytics Configuration for Lead Magnet Tracking
 */

import posthog from 'posthog-js'

// Define PostHog interface for window object
interface PostHogWindow extends Window {
	posthog?: {
		capture: (event: string, properties?: Record<string, unknown>) => void
		identify: (
			distinctId: string,
			properties?: Record<string, unknown>
		) => void
		isFeatureEnabled: (flagName: string) => boolean
	}
}

export const initPostHog = () => {
	if (
		typeof window !== 'undefined' &&
		process.env.NODE_ENV === 'production'
	) {
		const posthogKey = import.meta.env.VITE_POSTHOG_KEY
		const posthogHost =
			import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

		if (posthogKey) {
			posthog.init(posthogKey, {
				api_host: posthogHost,
				capture_pageview: false, // We'll manually track pageviews
				capture_pageleave: true,

				// Lead magnet specific configuration
				autocapture: {
					// Capture form interactions automatically
					capture_forms: true,
					capture_clicks: true,
					capture_pageview: false
				},

				// Session recording for funnel analysis
				session_recording: {
					recordCrossOriginIframes: false,
					// Only record for lead magnet pages
					urlTriggers: ['/invoice-generator'],
					// Disable inline stylesheets to prevent blob URL issues
					inlineStylesheet: false,
					// Use a more conservative capture mode
					captureConsole: false
				},

				// Feature flags for A/B testing
				enable_feature_flags: true,

				// Privacy settings
				respect_dnt: true,
				opt_out_capturing_by_default: false
			})

			// Set up lead magnet specific cohorts
			setupLeadMagnetCohorts()
		}
	}
}

export const setupLeadMagnetCohorts = () => {
	// Define cohorts for lead magnet analysis
	const leadMagnetCohorts = {
		invoice_generator_visitors: {
			description: 'Users who visited the invoice generator',
			criteria: { event: 'lead_magnet_generator_viewed' }
		},
		email_capturers: {
			description: 'Users who provided email for invoice download',
			criteria: { event: 'lead_magnet_email_captured' }
		},
		high_value_leads: {
			description: 'Leads with invoices > $500',
			criteria: {
				event: 'lead_magnet_email_captured',
				properties: { invoice_total: { gte: 500 } }
			}
		},
		business_email_leads: {
			description: 'Leads with business email addresses',
			criteria: {
				event: 'lead_magnet_email_captured',
				properties: { is_business_email: true }
			}
		},
		conversion_candidates: {
			description: 'Free users who hit usage limits',
			criteria: { event: 'lead_magnet_usage_limit_reached' }
		}
	}

	// You can set these up in PostHog dashboard or via API
	console.log('Lead Magnet Cohorts defined:', leadMagnetCohorts)
}

// Lead magnet specific tracking functions
export const trackLeadMagnetFunnel = (
	step: string,
	properties: Record<string, unknown>
) => {
	if (typeof window !== 'undefined' && (window as PostHogWindow).posthog) {
		;(window as PostHogWindow).posthog?.capture('lead_magnet_funnel_step', {
			funnel_step: step,
			...properties
		})
	}
}

export const identifyLead = (
	email: string,
	properties: Record<string, unknown>
) => {
	if (typeof window !== 'undefined' && (window as PostHogWindow).posthog) {
		;(window as PostHogWindow).posthog?.identify(email, {
			email,
			lead_source: 'invoice_generator',
			first_seen: new Date().toISOString(),
			...properties
		})
	}
}

export const trackConversion = (
	userId: string,
	revenue: number,
	properties: Record<string, unknown>
) => {
	if (typeof window !== 'undefined' && (window as PostHogWindow).posthog) {
		;(window as PostHogWindow).posthog?.capture('conversion', {
			user_id: userId,
			revenue,
			conversion_source: 'invoice_generator_lead_magnet',
			...properties
		})
	}
}

// A/B Testing helpers
export const getFeatureFlag = (
	flagName: string,
	defaultValue = false
): boolean => {
	if (typeof window !== 'undefined' && (window as PostHogWindow).posthog) {
		return (
			(window as PostHogWindow).posthog?.isFeatureEnabled(flagName) ??
			defaultValue
		)
	}
	return defaultValue
}

export const trackExperiment = (
	experimentName: string,
	variant: string,
	properties: Record<string, unknown> = {}
) => {
	if (typeof window !== 'undefined' && (window as PostHogWindow).posthog) {
		;(window as PostHogWindow).posthog?.capture('experiment_viewed', {
			experiment_name: experimentName,
			variant,
			...properties
		})
	}
}
