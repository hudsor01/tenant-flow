'use client'

import { usePostHog } from '@/hooks/use-posthog'
import { useCallback } from 'react'

/**
 * Business Event Tracking for TenantFlow
 * Track key business actions and user behaviors
 */

// Event Types for Type Safety
export interface PropertyEvent {
	property_id: string
	property_type?: string
	unit_count?: number
	has_photos?: boolean
	monthly_rent?: number
	created_at?: string
	[key: string]: unknown
}

export interface TenantEvent {
	tenant_id: string
	property_id?: string
	lease_status?: string
	payment_method?: string
	monthly_rent?: number
}

export interface LeaseEvent {
	lease_id: string
	property_id: string
	tenant_id: string
	lease_duration_months?: number
	monthly_rent: number
	security_deposit?: number
}

export interface SubscriptionEvent {
	plan_name: string
	billing_period: 'monthly' | 'yearly'
	amount: number
	previous_plan?: string
	discount_applied?: boolean
}

export interface MaintenanceEvent {
	request_id: string
	property_id: string
	priority: 'low' | 'medium' | 'high' | 'emergency'
	category: string
	estimated_cost?: number
	vendor_assigned?: boolean
}

/**
 * Business Events Hook
 */
export function useBusinessEvents() {
	const { posthog } = usePostHog()

	// Property Management Events
	const trackPropertyCreated = useCallback(
		(data: PropertyEvent) => {
			if (!posthog) return
			posthog.capture('property_created', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackPropertyUpdated = useCallback(
		(data: PropertyEvent) => {
			if (!posthog) return
			posthog.capture('property_updated', data)
		},
		[posthog]
	)

	const trackPropertyViewed = useCallback(
		(propertyId: string, context?: string) => {
			if (!posthog) return
			posthog.capture('property_viewed', {
				property_id: propertyId,
				context: context || 'property_list'
			})
		},
		[posthog]
	)

	// Tenant Management Events
	const trackTenantCreated = useCallback(
		(data: TenantEvent) => {
			if (!posthog) return
			posthog.capture('tenant_created', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackTenantAssigned = useCallback(
		(data: {
			tenant_id: string
			property_id: string
			unit_id?: string
		}) => {
			if (!posthog) return
			posthog.capture('tenant_assigned_to_property', data)
		},
		[posthog]
	)

	// Lease Management Events
	const trackLeaseCreated = useCallback(
		(data: LeaseEvent) => {
			if (!posthog) return
			posthog.capture('lease_created', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackLeaseSigned = useCallback(
		(leaseId: string, method: 'digital' | 'physical') => {
			if (!posthog) return
			posthog.capture('lease_signed', {
				lease_id: leaseId,
				signing_method: method,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	// Maintenance Events
	const trackMaintenanceRequested = useCallback(
		(data: MaintenanceEvent) => {
			if (!posthog) return
			posthog.capture('maintenance_request_created', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackMaintenanceCompleted = useCallback(
		(requestId: string, actualCost?: number, daysToComplete?: number) => {
			if (!posthog) return
			posthog.capture('maintenance_request_completed', {
				request_id: requestId,
				actual_cost: actualCost,
				days_to_complete: daysToComplete,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	// Business/Revenue Events
	const trackSubscriptionUpgrade = useCallback(
		(data: SubscriptionEvent) => {
			if (!posthog) return
			posthog.capture('subscription_upgraded', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackSubscriptionDowngrade = useCallback(
		(data: SubscriptionEvent) => {
			if (!posthog) return
			posthog.capture('subscription_downgraded', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackRentPaymentReceived = useCallback(
		(data: {
			tenant_id: string
			property_id: string
			amount: number
			payment_method: string
			late_fee?: number
			days_late?: number
		}) => {
			if (!posthog) return
			posthog.capture('rent_payment_received', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	// User Engagement Events
	const trackFeatureUsed = useCallback(
		(featureName: string, context?: Record<string, unknown>) => {
			if (!posthog) return
			posthog.capture('feature_used', {
				feature_name: featureName,
				...context,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackOnboardingStep = useCallback(
		(step: string, completed: boolean) => {
			if (!posthog) return
			posthog.capture('onboarding_step', {
				step,
				completed,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackDashboardView = useCallback(
		(section?: string) => {
			if (!posthog) return
			posthog.capture('dashboard_viewed', {
				section: section || 'overview',
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	// Error/Support Events
	const trackUserError = useCallback(
		(error: {
			error_type: string
			error_message: string
			page_url: string
			user_action?: string
		}) => {
			if (!posthog) return
			posthog.capture('user_error_encountered', {
				...error,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	const trackSupportTicket = useCallback(
		(data: {
			ticket_type: 'bug' | 'feature_request' | 'question' | 'billing'
			priority: 'low' | 'medium' | 'high'
			category?: string
		}) => {
			if (!posthog) return
			posthog.capture('support_ticket_created', {
				...data,
				timestamp: new Date().toISOString()
			})
		},
		[posthog]
	)

	return {
		// Property Management
		trackPropertyCreated,
		trackPropertyUpdated,
		trackPropertyViewed,

		// Tenant Management
		trackTenantCreated,
		trackTenantAssigned,

		// Lease Management
		trackLeaseCreated,
		trackLeaseSigned,

		// Maintenance
		trackMaintenanceRequested,
		trackMaintenanceCompleted,

		// Business/Revenue
		trackSubscriptionUpgrade,
		trackSubscriptionDowngrade,
		trackRentPaymentReceived,

		// User Engagement
		trackFeatureUsed,
		trackOnboardingStep,
		trackDashboardView,

		// Errors/Support
		trackUserError,
		trackSupportTicket
	}
}

/**
 * Convenience hook for tracking user interactions
 */
export function useInteractionTracking() {
	const { posthog } = usePostHog()

	const trackButtonClick = useCallback(
		(buttonName: string, context?: Record<string, unknown>) => {
			if (!posthog) return
			posthog.capture('button_clicked', {
				button_name: buttonName,
				...context
			})
		},
		[posthog]
	)

	const trackFormSubmission = useCallback(
		(formName: string, success: boolean, errors?: string[]) => {
			if (!posthog) return
			posthog.capture('form_submitted', {
				form_name: formName,
				success,
				errors: errors?.join(', ')
			})
		},
		[posthog]
	)

	const trackPageView = useCallback(
		(pageName: string, loadTime?: number) => {
			if (!posthog) return
			posthog.capture('page_viewed', {
				page_name: pageName,
				load_time_ms: loadTime
			})
		},
		[posthog]
	)

	const trackSearchPerformed = useCallback(
		(
			query: string,
			resultsCount: number,
			filters?: Record<string, unknown>
		) => {
			if (!posthog) return
			posthog.capture('search_performed', {
				search_query: query,
				results_count: resultsCount,
				filters
			})
		},
		[posthog]
	)

	return {
		trackButtonClick,
		trackFormSubmission,
		trackPageView,
		trackSearchPerformed
	}
}
