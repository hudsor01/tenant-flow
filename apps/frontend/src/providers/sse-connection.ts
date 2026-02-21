/**
 * SSE Connection Utilities
 *
 * Pure utility functions for establishing and reading the SSE stream.
 * No React dependencies - these run inside useCallback hooks in sse-provider.tsx.
 *
 * @module sse-connection
 */

import { getApiBaseUrl } from '#lib/api-config'
import type { SseEvent } from '@repo/shared/events/sse-events'
import { isSseEvent, SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	READINESS_CHECK_INTERVAL,
	MAX_READINESS_CHECKS
} from './sse-context'

const logger = createLogger({ component: 'SseProvider' })

/**
 * Check if backend is ready to accept connections.
 * Prevents 503 errors during backend startup/hot-reload.
 */
export async function waitForBackendReady(): Promise<boolean> {
	const baseUrl = getApiBaseUrl()
	for (let i = 0; i < MAX_READINESS_CHECKS; i++) {
		try {
			const response = await fetch(`${baseUrl}/health/ready`, {
				method: 'GET',
				cache: 'no-store'
			})
			if (response.ok) {
				return true
			}
			// 503 means not ready yet, wait and retry
			if (response.status === 503) {
				logger.debug('Backend not ready, waiting...', { attempt: i + 1 })
				await new Promise(resolve => setTimeout(resolve, READINESS_CHECK_INTERVAL))
				continue
			}
			// Other errors, proceed anyway (might work)
			return true
		} catch {
			// Network error, wait and retry
			await new Promise(resolve => setTimeout(resolve, READINESS_CHECK_INTERVAL))
		}
	}
	logger.warn('Backend readiness check timed out, proceeding anyway')
	return false
}

/**
 * Parse SSE line format (data: {...}) into a typed SseEvent.
 * Returns null for non-data lines or unparseable JSON.
 */
export function parseSseLine(line: string): SseEvent | null {
	if (!line.startsWith('data:')) return null
	try {
		const jsonStr = line.slice(5).trim()
		if (!jsonStr) return null
		const parsed = JSON.parse(jsonStr)
		return isSseEvent(parsed) ? parsed : null
	} catch {
		return null
	}
}

/**
 * Read and process all chunks from an SSE stream reader.
 * Calls onEvent for each complete SSE event parsed from the stream.
 */
export async function readSseStream(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	onEvent: (event: SseEvent) => void
): Promise<void> {
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
				onEvent(event)
			}
		}
	}
}
