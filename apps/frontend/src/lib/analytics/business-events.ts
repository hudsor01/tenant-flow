/**
 * Business events tracking for analytics
 * Tracks key business metrics and user actions
 */

import type { PostHog } from 'posthog-js'
import { usePostHog, type TenantFlowEvent } from '../../hooks/use-posthog'

export interface BusinessEvent {
	event: string
	properties?: Record<string, string | number | boolean>
	userId?: string
}

export interface PropertyEvent extends BusinessEvent {
	propertyId?: string
	propertyType?: string
	address?: string
}

export interface LeaseEvent extends BusinessEvent {
	leaseId?: string
	propertyId?: string
	tenantId?: string
	leaseStatus?: string
}

export interface TenantEvent extends BusinessEvent {
	tenantId?: string
	propertyId?: string
	tenantStatus?: string
}

/**
 * Track property-related business events
 */
export const trackPropertyEvent = (
	posthog: PostHog | null,
	event: PropertyEvent
) => {
	if (!posthog) {
		return
	}

	posthog.capture(event.event, {
		category: 'property',
		...event.properties,
		property_id: event.propertyId,
		property_type: event.propertyType,
		address: event.address,
		timestamp: new Date().toISOString()
	})
}

/**
 * Track lease-related business events
 */
export const trackLeaseEvent = (posthog: PostHog | null, event: LeaseEvent) => {
	if (!posthog) {
		return
	}

	posthog.capture(event.event, {
		category: 'lease',
		...event.properties,
		lease_id: event.leaseId,
		property_id: event.propertyId,
		tenant_id: event.tenantId,
		lease_status: event.leaseStatus,
		timestamp: new Date().toISOString()
	})
}

/**
 * Track tenant-related business events
 */
export const trackTenantEvent = (
	posthog: PostHog | null,
	event: TenantEvent
) => {
	if (!posthog) {
		return
	}

	posthog.capture(event.event, {
		category: 'tenant',
		...event.properties,
		tenant_id: event.tenantId,
		property_id: event.propertyId,
		tenant_status: event.tenantStatus,
		timestamp: new Date().toISOString()
	})
}

/**
 * Common business events
 */
export const BUSINESS_EVENTS = {
	// Property events
	PROPERTY_CREATED: 'property_created',
	PROPERTY_UPDATED: 'property_updated',
	PROPERTY_DELETED: 'property_deleted',
	PROPERTY_VIEWED: 'property_viewed',

	// Lease events
	LEASE_CREATED: 'lease_created',
	LEASE_UPDATED: 'lease_updated',
	LEASE_SIGNED: 'lease_signed',
	LEASE_EXPIRED: 'lease_expired',
	LEASE_TERMINATED: 'lease_terminated',

	// Tenant events
	TENANT_CREATED: 'tenant_created',
	TENANT_UPDATED: 'tenant_updated',
	TENANT_CONTACTED: 'tenant_contacted',
	TENANT_MOVED_IN: 'tenant_moved_in',
	TENANT_MOVED_OUT: 'tenant_moved_out'
} as const

export type BusinessEventType =
	(typeof BUSINESS_EVENTS)[keyof typeof BUSINESS_EVENTS]

/**
 * Hook for tracking business events
 * Integrates with PostHog for actual event tracking
 */
export const useBusinessEvents = () => {
	const { trackEvent: posthogTrackEvent, trackError } = usePostHog()

	const trackEvent = (event: BusinessEvent) => {
		posthogTrackEvent(event.event as TenantFlowEvent, {
			...event.properties,
			user_id: event.userId
		})
	}

	const trackPropertyCreated = (propertyData: Record<string, unknown>) => {
		posthogTrackEvent('property_created', {
			property_id: propertyData.id as string,
			property_type: propertyData.type as string,
			address: propertyData.address as string,
			...propertyData
		})
	}

	const trackPropertyUpdated = (propertyData: Record<string, unknown>) => {
		posthogTrackEvent('property_updated', {
			property_id: propertyData.id as string,
			property_type: propertyData.type as string,
			address: propertyData.address as string,
			...propertyData
		})
	}

	const trackLeaseCreated = (leaseData: Record<string, unknown>) => {
		posthogTrackEvent('lease_created', {
			lease_id: leaseData.id as string,
			property_id: leaseData.propertyId as string,
			tenant_id: leaseData.tenantId as string,
			...leaseData
		})
	}

	const trackTenantCreated = (tenantData: Record<string, unknown>) => {
		posthogTrackEvent('tenant_created', {
			tenant_id: tenantData.id as string,
			property_id: tenantData.propertyId as string,
			...tenantData
		})
	}

	const trackUserError = (error: Record<string, unknown>) => {
		if (error.error instanceof Error) {
			trackError(error.error as Error, {
				context: error.context as string,
				user_action: error.userAction as string,
				...error
			})
		} else {
			posthogTrackEvent('error_occurred', {
				error_message: error.message as string,
				error_code: error.code as string,
				context: error.context as string,
				...error
			})
		}
	}

	return {
		trackEvent,
		trackPropertyCreated,
		trackPropertyUpdated,
		trackLeaseCreated,
		trackTenantCreated,
		trackUserError
	}
}

/**
 * Hook for tracking interaction events
 * Integrates with PostHog for user interaction tracking
 */
export const useInteractionTracking = () => {
	const { trackEvent: posthogTrackEvent } = usePostHog()

	const trackInteraction = (
		interaction: string,
		properties?: Record<string, unknown>
	) => {
		posthogTrackEvent(interaction as TenantFlowEvent, {
			interaction_type: 'user_interaction',
			...properties
		})
	}

	const trackFormSubmission = (
		formType: string,
		success: boolean,
		errors?: string[]
	) => {
		posthogTrackEvent(
			success ? 'form_submitted' : 'form_submission_failed',
			{
				form_type: formType,
				success,
				error_count: errors?.length || 0,
				errors: errors?.join(', ') || undefined
			}
		)
	}

	return { trackInteraction, trackFormSubmission }
}
