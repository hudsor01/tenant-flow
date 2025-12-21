/**
 * SSE Hook - Server-Sent Events Client
 *
 * Connects to the backend SSE endpoint for real-time event streaming.
 * Replaces polling patterns with push notifications.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - TanStack Query cache invalidation on events
 * - Connection state management
 * - TypeScript-safe event handling
 *
 * @module use-sse
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'
import { isSseEvent, SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'

/**
 * SSE connection state
 */
export type SseConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * SSE hook options
 */
export interface UseSseOptions {
	/**
	 * Enable/disable SSE connection
	 * @default true
	 */
	enabled?: boolean

	/**
	 * Event types to listen for (empty array = all events)
	 * @default []
	 */
	eventTypes?: SseEventType[]

	/**
	 * Callback when any event is received
	 */
	onEvent?: (event: SseEvent) => void

	/**
	 * Callback when connection state changes
	 */
	onConnectionChange?: (state: SseConnectionState) => void

	/**
	 * Callback when connection error occurs
	 */
	onError?: (error: Event) => void

	/**
	 * Auto-invalidate TanStack Query cache based on event types
	 * @default true
	 */
	autoInvalidateQueries?: boolean

	/**
	 * Maximum reconnect attempts (0 = unlimited)
	 * @default 10
	 */
	maxReconnectAttempts?: number

	/**
	 * Initial reconnect delay in ms
	 * @default 1000
	 */
	initialReconnectDelay?: number

	/**
	 * Maximum reconnect delay in ms
	 * @default 30000
	 */
	maxReconnectDelay?: number
}

/**
 * SSE hook return value
 */
export interface UseSseReturn {
	/**
	 * Current connection state
	 */
	connectionState: SseConnectionState

	/**
	 * Whether connected to SSE
	 */
	isConnected: boolean

	/**
	 * Last received event
	 */
	lastEvent: SseEvent | null

	/**
	 * Number of reconnect attempts
	 */
	reconnectAttempts: number

	/**
	 * Manually disconnect
	 */
	disconnect: () => void

	/**
	 * Manually reconnect
	 */
	reconnect: () => void
}

/**
 * Query key mapping for automatic cache invalidation
 */
const EVENT_TO_QUERY_KEYS: Record<SseEventType, string[][]> = {
	'lease.signature_updated': [['leases'], ['lease']],
	'lease.activated': [['leases'], ['lease']],
	'pdf.generation_completed': [['leases'], ['lease']],
	'tenant.updated': [['tenants'], ['tenant']],
	'tenant.status_changed': [['tenants'], ['tenant']],
	'dashboard.stats_updated': [['owner', 'dashboard'], ['owner', 'analytics']],
	'payment.status_updated': [['tenant', 'payments'], ['tenant', 'amount-due']],
	connected: [],
	heartbeat: []
}

/**
 * Hook to connect to Server-Sent Events for real-time updates
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { isConnected, lastEvent } = useSse()
 *
 * // With specific event types
 * const { isConnected } = useSse({
 *   eventTypes: ['lease.signature_updated'],
 *   onEvent: (event) => console.log('Signature updated:', event)
 * })
 * ```
 */
export function useSse(options: UseSseOptions = {}): UseSseReturn {
	const {
		enabled = true,
		eventTypes = [],
		onEvent,
		onConnectionChange,
		onError,
		autoInvalidateQueries = true,
		maxReconnectAttempts = 10,
		initialReconnectDelay = 1000,
		maxReconnectDelay = 30000
	} = options

	const queryClient = useQueryClient()
	const eventSourceRef = useRef<EventSource | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const mountedRef = useRef(true)

	const [connectionState, setConnectionState] = useState<SseConnectionState>('disconnected')
	const [lastEvent, setLastEvent] = useState<SseEvent | null>(null)
	const [reconnectAttempts, setReconnectAttempts] = useState(0)

	/**
	 * Update connection state with callback
	 */
	const updateConnectionState = useCallback(
		(state: SseConnectionState) => {
			setConnectionState(state)
			onConnectionChange?.(state)
		},
		[onConnectionChange]
	)

	/**
	 * Invalidate queries based on event type
	 */
	const invalidateQueriesForEvent = useCallback(
		(event: SseEvent) => {
			if (!autoInvalidateQueries) return

			const queryKeys = EVENT_TO_QUERY_KEYS[event.type]
			if (!queryKeys || queryKeys.length === 0) return

			for (const queryKey of queryKeys) {
				queryClient.invalidateQueries({ queryKey })
			}
		},
		[queryClient, autoInvalidateQueries]
	)

	/**
	 * Handle incoming SSE message
	 */
	const handleMessage = useCallback(
		(messageEvent: MessageEvent) => {
			try {
				const event = JSON.parse(messageEvent.data) as unknown

				if (!isSseEvent(event)) {
					console.warn('[SSE] Received invalid event:', event)
					return
				}

				// Filter by event types if specified
				if (eventTypes.length > 0 && !eventTypes.includes(event.type)) {
					return
				}

				// Skip heartbeat from lastEvent to avoid noise
				if (event.type !== SSE_EVENT_TYPES.HEARTBEAT) {
					setLastEvent(event)
				}

				// Invalidate queries
				invalidateQueriesForEvent(event)

				// Call user callback
				onEvent?.(event)
			} catch {
				console.error('[SSE] Failed to parse event:', messageEvent.data)
			}
		},
		[eventTypes, onEvent, invalidateQueriesForEvent]
	)

	/**
	 * Calculate reconnect delay with exponential backoff
	 */
	const getReconnectDelay = useCallback(() => {
		const delay = Math.min(
			initialReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
			maxReconnectDelay
		)
		// Add jitter (0-25% of delay)
		return delay + Math.random() * delay * 0.25
	}, [initialReconnectDelay, maxReconnectDelay])

	/**
	 * Connect to SSE endpoint
	 */
	const connect = useCallback(async () => {
		if (!mountedRef.current) return

		// Cleanup existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}

		updateConnectionState('connecting')

		try {
			// Get access token
			const supabase = createClient()
			const {
				data: { session }
			} = await supabase.auth.getSession()

			if (!session?.access_token) {
				console.warn('[SSE] No access token available')
				updateConnectionState('error')
				return
			}

			// Build SSE URL with token query param
			const baseUrl = getApiBaseUrl()
			const sseUrl = `${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(session.access_token)}`

			// Create EventSource
			const eventSource = new EventSource(sseUrl)
			eventSourceRef.current = eventSource

			// Handle open
			eventSource.onopen = () => {
				if (!mountedRef.current) return
				console.log('[SSE] Connected')
				reconnectAttemptsRef.current = 0
				setReconnectAttempts(0)
				updateConnectionState('connected')
			}

			// Handle message
			eventSource.onmessage = handleMessage

			// Handle error
			eventSource.onerror = (error) => {
				if (!mountedRef.current) return
				console.error('[SSE] Connection error:', error)
				onError?.(error)

				// EventSource auto-reconnects, but we handle it manually for better control
				eventSource.close()
				eventSourceRef.current = null
				updateConnectionState('error')

				// Schedule reconnect
				if (maxReconnectAttempts === 0 || reconnectAttemptsRef.current < maxReconnectAttempts) {
					const delay = getReconnectDelay()
					console.log(`[SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current + 1})`)

					reconnectTimeoutRef.current = setTimeout(() => {
						if (mountedRef.current) {
							reconnectAttemptsRef.current++
							setReconnectAttempts(reconnectAttemptsRef.current)
							connect()
						}
					}, delay)
				} else {
					console.error('[SSE] Max reconnect attempts reached')
				}
			}
		} catch (error) {
			console.error('[SSE] Failed to connect:', error)
			updateConnectionState('error')
		}
	}, [updateConnectionState, handleMessage, onError, maxReconnectAttempts, getReconnectDelay])

	/**
	 * Disconnect from SSE
	 */
	const disconnect = useCallback(() => {
		// Clear reconnect timeout
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		// Close EventSource
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}

		updateConnectionState('disconnected')
	}, [updateConnectionState])

	/**
	 * Manually reconnect
	 */
	const reconnect = useCallback(() => {
		disconnect()
		reconnectAttemptsRef.current = 0
		setReconnectAttempts(0)
		connect()
	}, [disconnect, connect])

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		mountedRef.current = true

		if (enabled) {
			connect()
		}

		return () => {
			mountedRef.current = false
			disconnect()
		}
	}, [enabled, connect, disconnect])

	return {
		connectionState,
		isConnected: connectionState === 'connected',
		lastEvent,
		reconnectAttempts,
		disconnect,
		reconnect
	}
}

/**
 * Hook for specific SSE event type with typed payload
 *
 * @example
 * ```tsx
 * useSseEventListener('lease.signature_updated', (event) => {
 *   console.log('Lease signed:', event.payload.leaseId)
 * })
 * ```
 */
export function useSseEventListener<T extends SseEventType>(
	eventType: T,
	callback: (event: Extract<SseEvent, { type: T }>) => void,
	options: Omit<UseSseOptions, 'eventTypes' | 'onEvent'> = {}
) {
	return useSse({
		...options,
		eventTypes: [eventType],
		onEvent: (event) => {
			if (event.type === eventType) {
				callback(event as Extract<SseEvent, { type: T }>)
			}
		}
	})
}
