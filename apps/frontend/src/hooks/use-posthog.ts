'use client'

import { usePostHog as usePostHogBase } from 'posthog-js/react'
import { useCallback } from 'react'
import type { Tables } from '@repo/shared/types/supabase-generated'
import type { TenantFlowEvent } from '@repo/shared'

// ULTRA-NATIVE: Use generated type directly
type User = Tables<'User'>

// Custom event types for TenantFlow

export interface EventProperties {
	[key: string]: unknown
	error_message?: string
	error_code?: string
	user_id?: string
	organization_id?: string
	property_id?: string
	unit_id?: string
	tenant_id?: string
	lease_id?: string
	amount?: number
	currency?: string
}

export function usePostHog() {
	// Get PostHog instance - may be null/undefined during build
	const posthog = usePostHogBase()

	// Track custom events with consistent naming
	const trackEvent = useCallback(
		(event: TenantFlowEvent, properties?: EventProperties) => {
			if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
				return
			}

			// Add consistent metadata to all events
			const enrichedProperties = {
				...properties,
				app_version: process.env.NEXT_PUBLIC_APP_VERSION,
				environment: process.env.NEXT_PUBLIC_APP_ENV,
				timestamp: new Date().toISOString()
			}

			posthog.capture(event, enrichedProperties)
		},
		[posthog]
	)

	// Identify user with properties
	const identifyUser = useCallback(
		(user: User | null, organizationId?: string) => {
			if (!posthog || !user || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
				return
			}

			posthog.identify(user.id, {
				email: user.email,
				created_at: user.createdAt,
				organization_id: organizationId
			})
		},
		[posthog]
	)

	// Reset user identification on logout
	const resetUser = useCallback(() => {
		if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			return
		}

		posthog.reset()
	}, [posthog])

	// Track conversion goals
	const trackConversion = useCallback(
		(goalName: string, value?: number, properties?: EventProperties) => {
			if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
				return
			}

			posthog.capture('conversion_goal', {
				goal_name: goalName,
				goal_value: value,
				...properties
			})
		},
		[posthog]
	)

	// Track errors with context
	const trackError = useCallback(
		(error: Error, context?: EventProperties) => {
			if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
				return
			}

			const errorMessage =
				error instanceof Error ? error.message : String(error)
			const errorStack = error instanceof Error ? error.stack : undefined

			posthog.capture('error_occurred', {
				error_message: errorMessage,
				error_stack: errorStack,
				error_type:
					error instanceof Error ? error.name : 'UnknownError',
				...context
			})
		},
		[posthog]
	)

	// Feature flags removed for stable production version
	// All features are now enabled by default via env-config

	// Track timing metrics
	const trackTiming = useCallback(
		(category: string, variable: string, time: number, label?: string) => {
			if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
				return
			}

			posthog.capture('timing_metric', {
				timing_category: category,
				timing_variable: variable,
				timing_time: time,
				timing_label: label
			})
		},
		[posthog]
	)

	return {
		posthog,
		trackEvent,
		identifyUser,
		resetUser,
		trackConversion,
		trackError,
		trackTiming
	}
}