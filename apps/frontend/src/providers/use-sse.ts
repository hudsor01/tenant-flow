'use client'

/**
 * SSE Hooks - Consumer hooks for the SSE Provider
 *
 * Import from this file to use SSE functionality in components.
 * Requires <SseProvider> to be mounted in the tree.
 *
 * @module use-sse
 */

import { useContext, useEffect, useRef } from 'react'
import type { SseEvent, SseEventType } from '@repo/shared/events/sse-events'
import type { EventCallback } from './sse-context'
import { SseContext } from './sse-context'

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
