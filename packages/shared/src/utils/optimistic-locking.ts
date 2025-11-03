/**
 * Optimistic locking utilities for handling version conflicts
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { ApiError } from './api-error'

/**
 * Check if an error is a conflict error (409 status)
 */
export function isConflictError(error: unknown): boolean {
	if (error instanceof ApiError) {
		return error.statusCode === 409
	}
	if (error && typeof error === 'object' && 'status' in error) {
		return (error as { status: number }).status === 409
	}
	return false
}

/**
 * Handle conflict error by providing user-friendly message or invalidating cache
 * Overloaded to support both simple message generation and query cache invalidation
 */
export function handleConflictError(error: unknown): string
export function handleConflictError(
	entityType: string,
	id: string,
	queryClient: QueryClient,
	queryKeys: QueryKey[]
): void
export function handleConflictError(
	errorOrEntityType: unknown,
	id?: string,
	queryClient?: QueryClient,
	queryKeys?: QueryKey[]
): string | void {
	// If called with one parameter, return error message
	if (id === undefined || !queryClient || !queryKeys) {
		const error = errorOrEntityType
		if (isConflictError(error)) {
			return 'This item was modified by another user. Please refresh and try again.'
		}
		if (error instanceof Error) {
			return error.message
		}
		return 'An unexpected error occurred'
	}

	// If called with 4 parameters, invalidate query cache
	for (const queryKey of queryKeys) {
		queryClient.invalidateQueries({ queryKey })
	}
}

/**
 * Add version field to an object for optimistic locking
 * ONLY call this when you have a valid version number!
 */
export function withVersion<T extends object>(
	data: T,
	version: number
): T & { version: number } {
	return { ...data, version }
}

/**
 * Increment version number for optimistic locking
 * Can be used either to:
 * 1. Increment a version number: incrementVersion(5) => 6
 * 2. Merge data with an object and increment its version: incrementVersion(obj, newData) => { ...obj, ...newData, version: obj.version + 1 }
 */
export function incrementVersion(version: number): number
export function incrementVersion(version: null | undefined): number
export function incrementVersion<T extends { version?: number }>(obj: T): T
export function incrementVersion<T extends { version?: number }>(
	obj: T,
	newData: Partial<T>
): T
export function incrementVersion<T extends { version?: number }>(
	objectOrVersion: T | number | null | undefined,
	newData?: Partial<T>
): T | number {
	// If called with two arguments, merge data and increment version
	if (newData !== undefined && typeof objectOrVersion === 'object' && objectOrVersion !== null) {
		const currentVersion = objectOrVersion.version ?? 0
		return {
			...objectOrVersion,
			...newData,
			version: currentVersion + 1
		} as T
	}

	// If called with one argument, just increment the version number
	if (typeof objectOrVersion === 'number') {
		return objectOrVersion + 1
	}

	// If version is null/undefined, return 1
	if (objectOrVersion === null || objectOrVersion === undefined) {
		return 1
	}

	// If object with version, increment and return object
	const obj = objectOrVersion as T
	return {
		...obj,
		version: (obj.version ?? 0) + 1
	} as T
}