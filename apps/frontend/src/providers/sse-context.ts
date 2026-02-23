/**
 * SSE Context - Types, constants, and context definition
 *
 * Shared between sse-provider.tsx (SseProvider component) and
 * use-sse.ts (consumer hooks).
 *
 * @module sse-context
 */

import { createContext } from 'react'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'

// ============================================================================
// Types
// ============================================================================

export type SseConnectionState =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'disconnected'
	| 'error'
	| 'rate_limited'

export type EventCallback = (event: SseEvent) => void

export interface SseContextValue {
	/** Current connection state */
	connectionState: SseConnectionState
	/** Subscribe to SSE events - returns unsubscribe function */
	subscribe: (
		callback: EventCallback,
		eventTypes?: SseEventType[]
	) => () => void
	/** Manually reconnect */
	reconnect: () => void
	/** Whether currently connected */
	isConnected: boolean
}

// ============================================================================
// Constants
// ============================================================================

export const INITIAL_RECONNECT_DELAY = 2000
export const MAX_RECONNECT_DELAY = 60000
export const RATE_LIMIT_BACKOFF = 65000 // Just over 1 minute
export const MAX_RECONNECT_ATTEMPTS = 10
export const READINESS_CHECK_INTERVAL = 500 // Check every 500ms
export const MAX_READINESS_CHECKS = 10 // Max 5 seconds of waiting

/** Query keys to invalidate for each event type */
export const EVENT_TO_QUERY_KEYS: Record<SseEventType, string[][]> = {
	'lease.signature_updated': [['leases'], ['lease']],
	'lease.activated': [['leases'], ['lease']],
	'pdf.generation_completed': [['leases'], ['lease']],
	'tenant.updated': [['tenants'], ['tenant']],
	'tenant.status_changed': [['tenants'], ['tenant']],
	'dashboard.stats_updated': [['owner-dashboard']],
	'payment.status_updated': [['tenant-portal'], ['tenant-payments']],
	connected: [],
	heartbeat: []
}

// ============================================================================
// Context
// ============================================================================

export const SseContext = createContext<SseContextValue | null>(null)
