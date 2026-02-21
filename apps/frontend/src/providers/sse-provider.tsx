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
	useEffect,
	useRef,
	useState,
	useCallback,
	type ReactNode
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getApiBaseUrl } from '#lib/api-config'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { EventCallback, SseConnectionState, SseContextValue } from './sse-context'
import {
	SseContext,
	INITIAL_RECONNECT_DELAY,
	MAX_RECONNECT_DELAY,
	RATE_LIMIT_BACKOFF,
	MAX_RECONNECT_ATTEMPTS,
	EVENT_TO_QUERY_KEYS
} from './sse-context'
import { waitForBackendReady, readSseStream } from './sse-connection'

const logger = createLogger({ component: 'SseProvider' })

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

	/** Notify all subscribers of an event */
	const notifySubscribers = useCallback((event: SseEvent) => {
		subscribersRef.current.forEach(({ callback, eventTypes }) => {
			if (eventTypes && eventTypes.length > 0 && !eventTypes.includes(event.type)) {
				return
			}
			try {
				callback(event)
			} catch (error) {
				logger.error('Subscriber callback error', { error })
			}
		})
	}, [])

	/** Invalidate TanStack Query cache based on event type */
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
	 * Connect using fetch-based streaming.
	 * Uses fetch (not EventSource) to access HTTP status codes (can detect 429).
	 */
	const connect = useCallback(async () => {
		if (disabled || isConnectingRef.current || !isVisibleRef.current) return

		isConnectingRef.current = true
		setConnectionState('connecting')

		// Cleanup previous connection
		abortControllerRef.current?.abort()
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		try {
			const supabase = createClient()
			const { data: { session } } = await supabase.auth.getSession()

			if (!session?.access_token) {
				logger.debug('No session, SSE disabled')
				setConnectionState('idle')
				isConnectingRef.current = false
				return
			}

			// Wait for backend to be ready (prevents 503 errors during startup)
			await waitForBackendReady()

			const abortController = new AbortController()
			abortControllerRef.current = abortController

			const baseUrl = getApiBaseUrl()
			const response = await fetch(
				`${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(session.access_token)}`,
				{
					method: 'GET',
					headers: { Accept: 'text/event-stream' },
					signal: abortController.signal,
					cache: 'no-store'
				}
			)

			// Handle rate limiting (429)
			if (response.status === 429) {
				logger.warn('Rate limited, backing off', { backoff: RATE_LIMIT_BACKOFF })
				setConnectionState('rate_limited')
				isConnectingRef.current = false
				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectAttemptsRef.current = 0
					void connect()
				}, RATE_LIMIT_BACKOFF)
				return
			}

			// Handle service unavailable (503) - transient error, retry quickly
			if (response.status === 503) {
				logger.warn('Service unavailable, retrying', {
					attempt: reconnectAttemptsRef.current + 1
				})
				setConnectionState('error')
				isConnectingRef.current = false
				const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectAttemptsRef.current++
					void connect()
				}, delay)
				return
			}

			if (!response.ok) {
				throw new Error(`SSE connection failed: ${response.status}`)
			}

			// Connection successful - begin reading the stream
			logger.info('Connected')
			setConnectionState('connected')
			reconnectAttemptsRef.current = 0
			isConnectingRef.current = false

			const reader = response.body?.getReader()
			if (!reader) throw new Error('No response body')

			await readSseStream(reader, event => {
				invalidateQueries(event)
				notifySubscribers(event)
			})
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				logger.debug('Connection aborted')
				return
			}

			logger.error('Connection error', {
				message: error instanceof Error ? error.message : String(error)
			})
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
					void connect()
				}, delay + jitter)
			} else {
				logger.warn('Max reconnect attempts reached')
			}
		}
	}, [disabled, invalidateQueries, notifySubscribers])

	/** Disconnect and cleanup */
	const disconnect = useCallback(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}
		isConnectingRef.current = false
		setConnectionState('disconnected')
	}, [])

	/** Manual reconnect - resets attempt counter */
	const reconnect = useCallback(() => {
		disconnect()
		reconnectAttemptsRef.current = 0
		void connect()
	}, [disconnect, connect])

	/**
	 * Subscribe to events - returns unsubscribe function.
	 * Performant: no re-renders on subscribe/unsubscribe.
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
				void connect()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		if (!document.hidden) {
			void connect()
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
