/**
 * Optimistic Locking Utilities
 *
 * Helper functions for handling version-based optimistic locking in frontend mutations.
 *
 * @see docs/OPTIMISTIC_LOCKING_IMPLEMENTATION_COMPLETE.md
 */

import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@repo/shared/lib/frontend-logger'

/**
 * Check if an error is a 409 Conflict (optimistic locking failure)
 */
export function isConflictError(error: unknown): boolean {
	if (!(error instanceof Error)) return false

	const message = error.message.toLowerCase()
	return (
		message.includes('409') ||
		message.includes('conflict') ||
		message.includes('modified by another user')
	)
}

/**
 * Handle optimistic locking conflict error
 * Shows user-friendly toast and triggers refetch after delay
 */
export function handleConflictError(
	resourceType: string,
	resourceId: string,
	queryClient: QueryClient,
	queryKeys: string[][]
): void {
	toast.error('Update Conflict', {
		description: `This ${resourceType} was modified by another user. The page will refresh with the latest data.`,
		duration: 5000
	})

	// Force refetch to get latest data after short delay
	setTimeout(() => {
		queryKeys.forEach(key => {
			queryClient.invalidateQueries({ queryKey: key })
		})
	}, 1000)

	logger.warn('Optimistic locking conflict detected', {
		resourceType,
		resourceId
	})
}

/**
 * Create request body with version for optimistic locking
 */
export function withVersion<T extends Record<string, unknown>>(
	data: T,
	currentVersion: number | undefined
): T & { version?: number } {
	if (currentVersion === undefined) return data

	return {
		...data,
		version: currentVersion
	}
}

/**
 * Optimistically increment version in cached data
 */
export function incrementVersion<T extends { version: number }>(
	item: T,
	updates: Partial<T>
): T {
	return {
		...item,
		...updates,
		updatedAt: new Date().toISOString(),
		version: item.version + 1
	} as T
}
