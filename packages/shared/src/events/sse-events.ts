/**
 * Server-Sent Events (SSE) Type Definitions
 *
 * Shared types for real-time SSE communication between backend and frontend.
 * These replace polling patterns with push notifications.
 *
 * @module @repo/shared/events/sse-events
 */

/**
 * All SSE event type identifiers (defined first to avoid circular reference)
 */
export type SseEventType =
	| 'lease.signature_updated'
	| 'lease.activated'
	| 'pdf.generation_completed'
	| 'tenant.updated'
	| 'tenant.status_changed'
	| 'dashboard.stats_updated'
	| 'payment.status_updated'
	| 'connected'
	| 'heartbeat'

/**
 * Base SSE event structure
 */
export interface SseEventBase {
	/** Event type identifier */
	type: SseEventType
	/** ISO timestamp when event was created */
	timestamp: string
	/** Optional correlation ID for tracing */
	correlationId?: string
}

/**
 * Lease signature status update event
 * Replaces polling of GET /api/v1/leases/:id/signature-status
 */
export interface LeaseSignatureUpdatedEvent extends SseEventBase {
	type: 'lease.signature_updated'
	payload: {
		leaseId: string
		/** Which party signed */
		signedBy: 'owner' | 'tenant'
		/** Current overall signature status */
		status:
			| 'pending'
			| 'owner_signed'
			| 'tenant_signed'
			| 'fully_signed'
			| 'cancelled'
		/** Timestamp of the signature */
		signedAt: string
		/** Optional signer info */
		signerName?: string
	}
}

/**
 * Lease activated event (both parties signed, subscription pending)
 */
export interface LeaseActivatedEvent extends SseEventBase {
	type: 'lease.activated'
	payload: {
		leaseId: string
		tenantId: string
		/** Subscription status after activation */
		subscriptionStatus: 'pending' | 'active' | 'failed'
	}
}

/**
 * PDF generation completed event
 * Replaces polling of GET /api/v1/leases/:id/pdf-status
 */
export interface PdfGenerationCompletedEvent extends SseEventBase {
	type: 'pdf.generation_completed'
	payload: {
		leaseId: string
		/** Direct download URL */
		downloadUrl: string
		/** File size in bytes */
		fileSize?: number
	}
}

/**
 * Tenant data updated event
 * Replaces 30-second tenant data polling
 */
export interface TenantUpdatedEvent extends SseEventBase {
	type: 'tenant.updated'
	payload: {
		tenantId: string
		/** Fields that changed */
		changedFields: string[]
	}
}

/**
 * Tenant status changed event
 */
export interface TenantStatusChangedEvent extends SseEventBase {
	type: 'tenant.status_changed'
	payload: {
		tenantId: string
		previousStatus: string
		newStatus: string
	}
}

/**
 * Dashboard stats updated event
 * Replaces 2-minute dashboard polling
 */
export interface DashboardStatsUpdatedEvent extends SseEventBase {
	type: 'dashboard.stats_updated'
	payload: {
		/** Which stats categories were affected */
		affectedCategories: ('revenue' | 'occupancy' | 'maintenance' | 'payments')[]
	}
}

/**
 * Payment status updated event
 * Replaces 1-minute amount due polling
 */
export interface PaymentStatusUpdatedEvent extends SseEventBase {
	type: 'payment.status_updated'
	payload: {
		tenantId: string
		/** New payment status */
		status: 'succeeded' | 'failed' | 'pending'
		/** Updated balance amount (if applicable) */
		newBalance?: number
		/** Payment amount */
		amount?: number
	}
}

/**
 * Connection established event (sent on SSE connect)
 */
export interface SseConnectedEvent extends SseEventBase {
	type: 'connected'
	payload: {
		userId: string
		/** Session identifier for debugging */
		sessionId: string
	}
}

/**
 * Heartbeat/ping event to keep connection alive
 */
export interface SseHeartbeatEvent extends SseEventBase {
	type: 'heartbeat'
	payload: {
		/** Server timestamp */
		serverTime: string
	}
}

/**
 * Union of all SSE event types
 */
export type SseEvent =
	| LeaseSignatureUpdatedEvent
	| LeaseActivatedEvent
	| PdfGenerationCompletedEvent
	| TenantUpdatedEvent
	| TenantStatusChangedEvent
	| DashboardStatsUpdatedEvent
	| PaymentStatusUpdatedEvent
	| SseConnectedEvent
	| SseHeartbeatEvent

/**
 * SSE Event type constants for runtime use
 */
export const SSE_EVENT_TYPES = {
	// Lease events
	LEASE_SIGNATURE_UPDATED: 'lease.signature_updated',
	LEASE_ACTIVATED: 'lease.activated',

	// PDF events
	PDF_GENERATION_COMPLETED: 'pdf.generation_completed',

	// Tenant events
	TENANT_UPDATED: 'tenant.updated',
	TENANT_STATUS_CHANGED: 'tenant.status_changed',

	// Dashboard events
	DASHBOARD_STATS_UPDATED: 'dashboard.stats_updated',

	// Payment events
	PAYMENT_STATUS_UPDATED: 'payment.status_updated',

	// Connection events
	CONNECTED: 'connected',
	HEARTBEAT: 'heartbeat'
} as const

/**
 * Type guard for SSE events
 */
export function isSseEvent(value: unknown): value is SseEvent {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		'timestamp' in value &&
		typeof (value as SseEvent).type === 'string' &&
		typeof (value as SseEvent).timestamp === 'string'
	)
}

/**
 * Type guard for specific SSE event type
 */
export function isSseEventType<T extends SseEventType>(
	event: SseEvent,
	type: T
): event is Extract<SseEvent, { type: T }> {
	return event.type === type
}
