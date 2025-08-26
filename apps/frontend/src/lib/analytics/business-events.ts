/**
 * Business events tracking for analytics
 * Tracks key business metrics and user actions
 */

import type { PostHog } from 'posthog-js'

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
	if (!posthog) {return}

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
	if (!posthog) {return}

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
	if (!posthog) {return}

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
 * Simple wrapper around PostHog tracking
 */
export const useBusinessEvents = () => {
	// This is a placeholder - integrate with actual PostHog hook when available
	const trackEvent = (_event: BusinessEvent) => {
		// TODO: Implement actual tracking when PostHog integration is complete
	}

	const trackPropertyCreated = (_propertyData: Record<string, unknown>) => {
		// TODO: Implement actual tracking when PostHog integration is complete
	}

	const trackPropertyUpdated = (_propertyData: Record<string, unknown>) => {
		// TODO: Implement actual tracking when PostHog integration is complete
	}

	const trackLeaseCreated = (_leaseData: Record<string, unknown>) => {
		// TODO: Implement actual tracking when PostHog integration is complete
	}

	const trackTenantCreated = (_tenantData: Record<string, unknown>) => {
		// TODO: Implement actual tracking when PostHog integration is complete
	}

	const trackUserError = (_error: Record<string, unknown>) => {
		// TODO: Implement actual tracking when PostHog integration is complete
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
 * Simple wrapper for user interaction tracking
 */
export const useInteractionTracking = () => {
	// This is a placeholder - integrate with actual analytics when available
	const trackInteraction = (
		_interaction: string,
		_properties?: Record<string, unknown>
	) => {
		// TODO: Implement actual tracking when analytics integration is complete
	}

	const trackFormSubmission = (
		_formType: string,
		_success: boolean,
		_errors?: string[]
	) => {
		// TODO: Implement actual tracking when analytics integration is complete
	}

	return { trackInteraction, trackFormSubmission }
}
