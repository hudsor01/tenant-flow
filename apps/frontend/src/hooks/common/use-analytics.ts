'use client'

import { usePostHog as usePostHogBase } from 'posthog-js/react'
import { useCallback } from 'react'

/**
 * Simplified Analytics Hook - Following PostHog Best Practices 2025
 *
 * PHILOSOPHY:
 * - Track only business-critical events that drive decisions
 * - Use PostHog autocapture for page views, clicks, form submissions
 * - Focus on conversion funnels and feature adoption
 * - Minimize performance impact
 */

// Essential Events Only - Reduced from 80+ to ~15 critical events
export type EssentialAnalyticsEvent =
	// User Lifecycle (Critical for business metrics)
	| 'user_signed_up'
	| 'user_activated' // First meaningful action (created property)
	| 'subscription_created'
	| 'subscription_cancelled'
	| 'user_churned'

	// Core Product Usage (Activation & Feature Adoption)
	| 'property_created' // Key business object
	| 'tenant_added' // Core workflow completion
	| 'lease_generated' // Main feature usage
	| 'maintenance_requested' // Support workflow

	// Business Critical Actions
	| 'payment_completed'
	| 'payment_failed'
	| 'trial_started'
	| 'trial_converted'

	// System Health Only
	| 'error_occurred'

// Simplified event properties - focus on business value
export interface AnalyticsProperties {
	// Core identifiers
	user_id?: string
	organization_id?: string

	// Business context
	plan_type?: string
	feature_name?: string
	value_amount?: number

	// Error context (only for error events)
	error_message?: string
	error_code?: string

	// Custom properties for specific events
	[key: string]: string | number | boolean | undefined
}

export interface UseAnalyticsOptions {
	// Enable debug logging in development
	debug?: boolean
	// Custom user properties to track
	userProperties?: Record<string, string | number | boolean>
}

/**
 * Simplified Analytics Hook
 * Replaces: usePostHog, useBusinessEvents, usePropertyTracking, useInteractionTracking
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
	const posthog = usePostHogBase()
	const { debug = false } = options

	// DRY: Centralized availability check
	const isPostHogAvailable = useCallback(
		() => Boolean(posthog && process.env.NEXT_PUBLIC_POSTHOG_KEY),
		[posthog]
	)

	// DRY: Centralized enrichment of event properties
	const enrichProperties = useCallback(
		(properties?: AnalyticsProperties) => ({
			...properties,
			app_version: process.env.NEXT_PUBLIC_APP_VERSION,
			environment: process.env.NEXT_PUBLIC_APP_ENV,
			timestamp: new Date().toISOString()
		}),
		[]
	)

	// Single track method - replaces multiple tracking functions
	const track = useCallback(
		(event: EssentialAnalyticsEvent, properties?: AnalyticsProperties) => {
			if (!isPostHogAvailable()) {
				if (debug) {
					console.warn('[Analytics] Skipped:', event, properties)
				}
				return
			}

			const enrichedProperties = enrichProperties(properties)
			posthog.capture(event, enrichedProperties)

			if (debug) {
				console.warn('[Analytics] Tracked:', event, enrichedProperties)
			}
		},
		[posthog, debug, isPostHogAvailable, enrichProperties]
	)

	// User identification - simplified
	const identify = useCallback(
		(
			userId: string,
			properties?: Record<string, string | number | boolean>
		) => {
			if (!isPostHogAvailable()) {
				return
			}

			posthog.identify(userId, {
				...properties,
				...options.userProperties
			})

			if (debug) {
				console.warn('[Analytics] Identified user:', userId, properties)
			}
		},
		[posthog, debug, isPostHogAvailable, options.userProperties]
	)

	// Reset user session
	const reset = useCallback(() => {
		if (!isPostHogAvailable()) {
			return
		}

		posthog.reset()

		if (debug) {
			console.warn('[Analytics] Reset user session')
		}
	}, [posthog, debug, isPostHogAvailable])

	// Conversion tracking - for business critical goals
	const trackConversion = useCallback(
		(
			goalName: string,
			value?: number,
			properties?: AnalyticsProperties
		) => {
			track('user_activated', {
				goal_name: goalName,
				goal_value: value,
				...properties
			})
		},
		[track]
	)

	// Error tracking - simplified
	const trackError = useCallback(
		(error: Error, context?: AnalyticsProperties) => {
			const errorMessage =
				error instanceof Error ? error.message : String(error)

			track('error_occurred', {
				error_message: errorMessage,
				error_type:
					error instanceof Error ? error.name : 'UnknownError',
				...context
			})
		},
		[track]
	)

	return {
		// Core methods
		track,
		identify,
		reset,

		// Convenience methods
		trackConversion,
		trackError,

		// Direct PostHog access for advanced use cases
		posthog
	}
}

export type UseAnalyticsReturn = ReturnType<typeof useAnalytics>
