'use client'

/**
 * SSE Provider - Singleton Server-Sent Events Connection
 *
 * Manages a single SSE connection for the entire app using React Context.
 * Much more performant than per-component connections.
 *
 * Features:
 * - Single connection shared across all consumers
 * - Fetch-based streaming (can detect 429 status codes)
 * - Page Visibility API integration (disconnects when tab hidden)
 * - Automatic TanStack Query cache invalidation
 * - Zero re-renders for event listeners (uses refs + subscriptions)
 *
 * @module sse-provider
 */

import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	useCallback,
	type ReactNode
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '#utils/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'
import { isSseEvent, SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'SseProvider' })

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

type EventCallback = (event: SseEvent) => void

interface SseContextValue {
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

const INITIAL_RECONNECT_DELAY = 2000
const MAX_RECONNECT_DELAY = 60000
const RATE_LIMIT_BACKOFF = 65000 // Just over 1 minute
const MAX_RECONNECT_ATTEMPTS = 10

/** Query keys to invalidate for each event type */
const EVENT_TO_QUERY_KEYS: Record<SseEventType, string[][]> = {
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

const SseContext = createContext<SseContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

interface SseProviderProps {
	children: ReactNode
	/** Disable SSE entirely (useful for testing) */
	disabled?: boolean
}

export function SseProvider({ children, disabled = false }: SseProviderProps) {
	const queryClient = useQueryClient()

	// Connection state (only thing that causes re-renders)
	const [connectionState, setConnectionState] =
		useState<SseConnectionState>('idle')

	// Refs for mutable state (no re-renders)
	const abortControllerRef = useRef<AbortController | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const subscribersRef = useRef<
		Map<
			symbol,
			{ callback: EventCallback; eventTypes: SseEventType[] | undefined }
		>
	>(new Map())
	const isConnectingRef = useRef(false)
	const isVisibleRef = useRef(
		typeof document !== 'undefined' ? !document.hidden : true
	)

	/**
	 * Notify all subscribers of an event
	 */
	const notifySubscribers = useCallback((event: SseEvent) => {
		subscribersRef.current.forEach(({ callback, eventTypes }) => {
			// Filter by event types if specified
			if (
				eventTypes &&
				eventTypes.length > 0 &&
				!eventTypes.includes(event.type)
			) {
				return
			}
			try {
				callback(event)
			} catch (error) {
				logger.error('Subscriber callback error', { error })
			}
		})
	}, [])

	/**
	 * Invalidate TanStack Query cache based on event type
	 */
	const invalidateQueries = useCallback(
		(event: SseEvent) => {
			const queryKeys = EVENT_TO_QUERY_KEYS[event.type]
			if (queryKeys && queryKeys.length > 0) {
				for (const queryKey of queryKeys) {
					queryClient.invalidateQueries({ queryKey })
				}
			}
		},
		[queryClient]
	)

	/**
	 * Parse SSE line format (data: {...})
	 */
	const parseSseLine = useCallback((line: string): SseEvent | null => {
		if (!line.startsWith('data:')) return null
		try {
			const jsonStr = line.slice(5).trim()
			if (!jsonStr) return null
			const parsed = JSON.parse(jsonStr)
			return isSseEvent(parsed) ? parsed : null
		} catch {
			return null
		}
	}, [])

	/**
	 * Connect using fetch-based streaming
	 * This gives us access to HTTP status codes (can detect 429)
	 */
	const connect = useCallback(async () => {
		if (disabled || isConnectingRef.current || !isVisibleRef.current) return

		isConnectingRef.current = true
		setConnectionState('connecting')

		// Cleanup previous connection
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		try {
			// Get access token
			const supabase = createClient()
			const {
				data: { session }
			} = await supabase.auth.getSession()

			if (!session?.access_token) {
				logger.debug('No session, SSE disabled')
				setConnectionState('idle')
				isConnectingRef.current = false
				return
			}

			// Create abort controller for this connection
			const abortController = new AbortController()
			abortControllerRef.current = abortController

			// Fetch with streaming
			const baseUrl = getApiBaseUrl()
			const response = await fetch(
				`${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(session.access_token)}`,
				{
					method: 'GET',
					headers: { Accept: 'text/event-stream' },
					signal: abortController.signal,
					// Prevent caching
					cache: 'no-store'
				}
			)

			// Handle rate limiting (429)
			if (response.status === 429) {
				logger.warn('Rate limited, backing off', {
					backoff: RATE_LIMIT_BACKOFF
				})
				setConnectionState('rate_limited')
				isConnectingRef.current = false
				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectAttemptsRef.current = 0
					connect()
				}, RATE_LIMIT_BACKOFF)
				return
			}

			// Handle other errors
			if (!response.ok) {
				throw new Error(`SSE connection failed: ${response.status}`)
			}

			// Connection successful
			logger.info('Connected')
			setConnectionState('connected')
			reconnectAttemptsRef.current = 0
			isConnectingRef.current = false

			// Read the stream
			const reader = response.body?.getReader()
			if (!reader) throw new Error('No response body')

			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { done, value } = await reader.read()

				if (done) {
					logger.debug('Stream ended')
					break
				}

				// Decode chunk and add to buffer
				buffer += decoder.decode(value, { stream: true })

				// Process complete lines
				const lines = buffer.split('\n')
				buffer = lines.pop() || '' // Keep incomplete line in buffer

				for (const line of lines) {
					const trimmed = line.trim()
					if (!trimmed) continue

					const event = parseSseLine(trimmed)
					if (event) {
						// Skip heartbeat from logging noise
						if (event.type !== SSE_EVENT_TYPES.HEARTBEAT) {
							logger.debug('Event received', { type: event.type })
						}
						invalidateQueries(event)
						notifySubscribers(event)
					}
				}
			}
		} catch (error) {
			// Ignore abort errors (intentional disconnect)
			if (error instanceof Error && error.name === 'AbortError') {
				logger.debug('Connection aborted')
				return
			}

			logger.error('Connection error', { error })
			setConnectionState('error')
			isConnectingRef.current = false

			// Schedule reconnect with exponential backoff
			if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
				const delay = Math.min(
					INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
					MAX_RECONNECT_DELAY
				)
				const jitter = delay * 0.25 * Math.random()

				logger.debug('Scheduling reconnect', {
					attempt: reconnectAttemptsRef.current + 1,
					delay: delay + jitter
				})

				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectAttemptsRef.current++
					connect()
				}, delay + jitter)
			} else {
				logger.warn('Max reconnect attempts reached')
			}
		}
	}, [disabled, parseSseLine, invalidateQueries, notifySubscribers])

	/**
	 * Disconnect and cleanup
	 */
	const disconnect = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}
		isConnectingRef.current = false
		setConnectionState('disconnected')
	}, [])

	/**
	 * Manual reconnect (resets attempt counter)
	 */
	const reconnect = useCallback(() => {
		disconnect()
		reconnectAttemptsRef.current = 0
		connect()
	}, [disconnect, connect])

	/**
	 * Subscribe to events - returns unsubscribe function
	 * This is the performant pattern: no re-renders on subscribe/unsubscribe
	 */
	const subscribe = useCallback(
		(callback: EventCallback, eventTypes?: SseEventType[]): (() => void) => {
			const id = Symbol()
			subscribersRef.current.set(id, { callback, eventTypes })

			return () => {
				subscribersRef.current.delete(id)
			}
		},
		[]
	)

	// Page Visibility API - disconnect when hidden, reconnect when visible
	useEffect(() => {
		if (disabled || typeof document === 'undefined') return

		const handleVisibilityChange = () => {
			isVisibleRef.current = !document.hidden

			if (document.hidden) {
				logger.debug('Page hidden, disconnecting')
				disconnect()
			} else {
				logger.debug('Page visible, reconnecting')
				connect()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Initial connection
		if (!document.hidden) {
			connect()
		}

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			disconnect()
		}
	}, [disabled, connect, disconnect])

	const contextValue: SseContextValue = {
		connectionState,
		subscribe,
		reconnect,
		isConnected: connectionState === 'connected'
	}

	return (
		<SseContext.Provider value={contextValue}>{children}</SseContext.Provider>
	)
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get SSE connection state and controls
 */
export function useSseConnection() {
	const context = useContext(SseContext)
	if (!context) {
		throw new Error('useSseConnection must be used within SseProvider')
	}
	return context
}

/**
 * Subscribe to SSE events with automatic cleanup
 *
 * @example
 * ```tsx
 * // Listen to all events
 * useSseEvents((event) => console.log(event))
 *
 * // Listen to specific events
 * useSseEvents(
 *   (event) => console.log('Lease updated:', event),
 *   ['lease.signature_updated', 'lease.activated']
 * )
 * ```
 */
export function useSseEvents(
	callback: EventCallback,
	eventTypes?: SseEventType[]
) {
	const { subscribe } = useSseConnection()
	const callbackRef = useRef(callback)
	callbackRef.current = callback

	useEffect(() => {
		// Use ref to avoid re-subscribing when callback changes
		return subscribe(event => callbackRef.current(event), eventTypes)
	}, [subscribe, eventTypes])
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
	callback: (event: Extract<SseEvent, { type: T }>) => void
) {
	const callbackRef = useRef(callback)
	callbackRef.current = callback

	useSseEvents(
		event => {
			if (event.type === eventType) {
				callbackRef.current(event as Extract<SseEvent, { type: T }>)
			}
		},
		[eventType]
	)
}
