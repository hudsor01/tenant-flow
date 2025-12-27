/**
 * SSE Hook - Server-Sent Events Client
 *
 * @deprecated Use `SseProvider` and `useSseConnection`/`useSseEvents` from
 * `#providers/sse-provider` instead. The provider approach is more performant:
 * - Single connection shared across the entire app
 * - Fetch-based streaming (can detect 429 rate limiting)
 * - Page Visibility API integration (disconnects when tab hidden)
 * - Subscription pattern with zero re-renders
 *
 * This hook is kept for backwards compatibility but should not be used.
 *
 * @module use-sse
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'
import { isSseEvent, SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'UseSse' })

/**
 * Global connection state to prevent multiple concurrent connections
 * This is shared across all hook instances to ensure only one SSE connection exists
 */
let globalEventSource: EventSource | null = null
let globalConnectionCount = 0
let lastConnectionAttempt = 0
const MIN_CONNECTION_INTERVAL = 5000 // Minimum 5s between connection attempts

/**
 * SSE connection state
 */
export type SseConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'rate_limited'

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
	 * @default 2000
	 */
	initialReconnectDelay?: number

	/**
	 * Maximum reconnect delay in ms
	 * @default 60000
	 */
	maxReconnectDelay?: number

	/**
	 * Rate limit backoff delay in ms (used when 429 is received)
	 * @default 65000 (just over 1 minute to reset the rate limit)
	 */
	rateLimitBackoffDelay?: number
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
	 * Whether rate limited (429 detected)
	 */
	isRateLimited: boolean

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
 * Maps SSE event types to TanStack Query keys for cache invalidation
 */
const EVENT_TO_QUERY_KEYS: Record<SseEventType, string[][]> = {
	'lease.signature_updated': [['leases'], ['lease']],
	'lease.activated': [['leases'], ['lease']],
	'pdf.generation_completed': [['leases'], ['lease']],
	'tenant.updated': [['tenants'], ['tenant']],
	'tenant.status_changed': [['tenants'], ['tenant']],
	// Dashboard uses 'owner-dashboard' as base key
	'dashboard.stats_updated': [['owner-dashboard']],
	// Tenant portal payment queries
	'payment.status_updated': [['tenant-portal'], ['tenant-payments']],
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
		initialReconnectDelay = 2000,
		maxReconnectDelay = 60000,
		rateLimitBackoffDelay = 65000
	} = options

	const queryClient = useQueryClient()
	const eventSourceRef = useRef<EventSource | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const mountedRef = useRef(true)
	const isConnectingRef = useRef(false)
	const hasConnectedOnceRef = useRef(false)

	const [connectionState, setConnectionState] = useState<SseConnectionState>('disconnected')
	const [lastEvent, setLastEvent] = useState<SseEvent | null>(null)
	const [reconnectAttempts, setReconnectAttempts] = useState(0)

	// Store ALL mutable dependencies in refs to completely stabilize callbacks
	const optionsRef = useRef({
		eventTypes,
		onEvent,
		onConnectionChange,
		onError,
		autoInvalidateQueries,
		maxReconnectAttempts,
		initialReconnectDelay,
		maxReconnectDelay,
		rateLimitBackoffDelay
	})

	// Update refs when options change (no effect re-runs)
	optionsRef.current = {
		eventTypes,
		onEvent,
		onConnectionChange,
		onError,
		autoInvalidateQueries,
		maxReconnectAttempts,
		initialReconnectDelay,
		maxReconnectDelay,
		rateLimitBackoffDelay
	}

	/**
	 * Update connection state with callback
	 */
	const updateConnectionState = useCallback((state: SseConnectionState) => {
		setConnectionState(state)
		optionsRef.current.onConnectionChange?.(state)
	}, [])

	/**
	 * Calculate reconnect delay with exponential backoff
	 */
	const getReconnectDelay = useCallback(() => {
		const { initialReconnectDelay: initial, maxReconnectDelay: max } = optionsRef.current
		const delay = Math.min(initial * Math.pow(2, reconnectAttemptsRef.current), max)
		// Add jitter (0-25% of delay)
		return delay + Math.random() * delay * 0.25
	}, [])

	/**
	 * Handle incoming SSE message - stable callback using refs
	 */
	const handleMessage = useCallback(
		(messageEvent: MessageEvent) => {
			try {
				const event = JSON.parse(messageEvent.data) as unknown

				if (!isSseEvent(event)) {
					logger.warn('Received invalid event', { event })
					return
				}

				// Filter by event types if specified
				const types = optionsRef.current.eventTypes
				if (types.length > 0 && !types.includes(event.type)) {
					return
				}

				// Skip heartbeat from lastEvent to avoid noise
				if (event.type !== SSE_EVENT_TYPES.HEARTBEAT) {
					setLastEvent(event)
				}

				// Invalidate queries
				if (optionsRef.current.autoInvalidateQueries) {
					const queryKeys = EVENT_TO_QUERY_KEYS[event.type]
					if (queryKeys && queryKeys.length > 0) {
						for (const queryKey of queryKeys) {
							queryClient.invalidateQueries({ queryKey })
						}
					}
				}

				// Call user callback
				optionsRef.current.onEvent?.(event)
			} catch {
				logger.error('Failed to parse event', { data: messageEvent.data })
			}
		},
		[queryClient]
	)

	/**
	 * Connect to SSE endpoint - stable callback
	 */
	const connect = useCallback(async () => {
		// Prevent concurrent connection attempts
		if (!mountedRef.current || isConnectingRef.current) return

		// Debounce: prevent rapid connection attempts (especially in React Strict Mode)
		const now = Date.now()
		const timeSinceLastAttempt = now - lastConnectionAttempt
		if (timeSinceLastAttempt < MIN_CONNECTION_INTERVAL) {
			logger.debug('Debouncing connection attempt', {
				timeSinceLastAttempt,
				minInterval: MIN_CONNECTION_INTERVAL
			})
			// Schedule a delayed connection attempt
			reconnectTimeoutRef.current = setTimeout(() => {
				if (mountedRef.current) {
					connect()
				}
			}, MIN_CONNECTION_INTERVAL - timeSinceLastAttempt)
			return
		}

		// If there's already a global connection, reuse it
		if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
			logger.debug('Reusing existing global SSE connection')
			eventSourceRef.current = globalEventSource
			updateConnectionState('connected')
			return
		}

		isConnectingRef.current = true
		lastConnectionAttempt = now
		globalConnectionCount++

		// Cleanup existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}
		if (globalEventSource) {
			globalEventSource.close()
			globalEventSource = null
		}

		// Clear any pending reconnect
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		updateConnectionState('connecting')

		try {
			// Get access token
			const supabase = createClient()
			const {
				data: { session }
			} = await supabase.auth.getSession()

			if (!session?.access_token) {
				logger.warn('No access token available, SSE disabled')
				updateConnectionState('disconnected')
				isConnectingRef.current = false
				return
			}

			// Build SSE URL with token query param
			const baseUrl = getApiBaseUrl()
			const sseUrl = `${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(session.access_token)}`

			// Create EventSource
			const eventSource = new EventSource(sseUrl)
			eventSourceRef.current = eventSource
			globalEventSource = eventSource

			// Handle open
			eventSource.onopen = () => {
				if (!mountedRef.current) return
				logger.info('Connected')
				reconnectAttemptsRef.current = 0
				setReconnectAttempts(0)
				isConnectingRef.current = false
				hasConnectedOnceRef.current = true
				updateConnectionState('connected')
			}

			// Handle message
			eventSource.onmessage = handleMessage

			// Handle error - includes rate limiting detection
			eventSource.onerror = (errorEvent) => {
				if (!mountedRef.current) return

				// Check if this is a rate limit error (429)
				// Note: EventSource doesn't expose HTTP status, but rapid failures suggest rate limiting
				const isLikelyRateLimited =
					reconnectAttemptsRef.current >= 3 &&
					Date.now() - lastConnectionAttempt < 10000

				if (isLikelyRateLimited) {
					logger.warn('Likely rate limited, backing off for 1 minute')
					eventSource.close()
					eventSourceRef.current = null
					globalEventSource = null
					isConnectingRef.current = false
					updateConnectionState('rate_limited')

					// Use rate limit backoff delay
					const { rateLimitBackoffDelay: backoffDelay } = optionsRef.current
					reconnectTimeoutRef.current = setTimeout(() => {
						if (mountedRef.current) {
							reconnectAttemptsRef.current = 0 // Reset attempts after backoff
							setReconnectAttempts(0)
							connect()
						}
					}, backoffDelay)
					return
				}

				// Only log on first error after a successful connection
				if (hasConnectedOnceRef.current && reconnectAttemptsRef.current === 0) {
					logger.warn('Connection lost, will retry')
				}

				optionsRef.current.onError?.(errorEvent)

				// EventSource auto-reconnects, but we handle it manually for better control
				eventSource.close()
				eventSourceRef.current = null
				globalEventSource = null
				isConnectingRef.current = false
				updateConnectionState('error')

				// Schedule reconnect
				const { maxReconnectAttempts: maxAttempts } = optionsRef.current
				if (maxAttempts === 0 || reconnectAttemptsRef.current < maxAttempts) {
					const delay = getReconnectDelay()

					reconnectTimeoutRef.current = setTimeout(() => {
						if (mountedRef.current) {
							reconnectAttemptsRef.current++
							setReconnectAttempts(reconnectAttemptsRef.current)
							connect()
						}
					}, delay)
				} else {
					logger.warn('Max reconnect attempts reached, giving up')
				}
			}
		} catch (error) {
			logger.error('Failed to connect', { error })
			isConnectingRef.current = false
			updateConnectionState('error')
		}
	}, [updateConnectionState, handleMessage, getReconnectDelay])

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
			// Only close global connection if this is the last subscriber
			globalConnectionCount = Math.max(0, globalConnectionCount - 1)
			if (globalConnectionCount === 0 && globalEventSource) {
				globalEventSource.close()
				globalEventSource = null
			}
			eventSourceRef.current = null
		}

		isConnectingRef.current = false
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

	// Single effect for mount/unmount - dependencies are now stable
	useEffect(() => {
		mountedRef.current = true

		if (enabled) {
			connect()
		}

		return () => {
			mountedRef.current = false
			disconnect()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- connect/disconnect are stable
	}, [enabled])

	return {
		connectionState,
		isConnected: connectionState === 'connected',
		isRateLimited: connectionState === 'rate_limited',
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
