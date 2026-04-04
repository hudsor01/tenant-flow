/**
 * Generic entity detail hook factory.
 * Wraps useQuery with optional placeholderData from list caches.
 *
 * Replaces the hand-written pattern of:
 *   const queryClient = useQueryClient()
 *   return useQuery({ ...detailOptions, placeholderData: () => { ... } })
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'

/**
 * Config accepted by useEntityDetail. The queryOptions field accepts
 * the return value of a queryOptions() factory call directly.
 */
export interface EntityDetailConfig {
	/** Return value from a queryOptions() factory — spread into useQuery */
	queryOptions: { queryKey: QueryKey; queryFn?: unknown } & Record<string, unknown>
	/** Query key prefix to search list caches for placeholderData */
	listQueryKey?: readonly unknown[]
	/** Entity ID to match within list cache data */
	id: string
}

/**
 * Find an entity in list caches by ID.
 * Supports both PaginatedResponse<T> ({ data: T[] }) and plain T[] shapes.
 */
function findInListCaches<T extends { id: string }>(
	listCaches: [QueryKey, ({ data?: T[] } | T[]) | undefined][],
	id: string
): T | undefined {
	for (const [, cached] of listCaches) {
		if (!cached) continue

		// Handle PaginatedResponse shape: { data: T[] }
		if (
			!Array.isArray(cached) &&
			typeof cached === 'object' &&
			'data' in cached &&
			Array.isArray(cached.data)
		) {
			const item = cached.data.find(entry => entry.id === id)
			if (item) return item
		}

		// Handle plain array shape: T[]
		if (Array.isArray(cached)) {
			const item = cached.find(entry => entry.id === id)
			if (item) return item
		}
	}
	return undefined
}

/**
 * Generic hook for fetching a single entity by ID.
 * When listQueryKey is provided, searches list caches for placeholderData
 * to enable instant detail views from list-to-detail navigation.
 */
export function useEntityDetail<T extends { id: string }>(
	config: EntityDetailConfig
) {
	// Always call useQueryClient unconditionally (React Compiler requires stable hook calls)
	const queryClient = useQueryClient()

	const { queryOptions: opts, listQueryKey, id } = config

	// Build placeholderData function conditionally, but call useQuery unconditionally
	// to satisfy react-hooks/rules-of-hooks
	const placeholderData = listQueryKey
		? () =>
				findInListCaches<T>(
					queryClient.getQueriesData<{ data?: T[] } | T[]>({
						queryKey: listQueryKey
					}),
					id
				)
		: undefined

	// Cast is safe: opts is always a queryOptions() return value with proper queryKey/queryFn,
	// and T extends { id: string } (always an object, never a function) so
	// NonFunctionGuard<T> = T at runtime. TypeScript can't prove this for generics.
	return useQuery({
		...opts,
		...(placeholderData ? { placeholderData } : {})
	} as UseQueryOptions<T, Error, T, QueryKey>)
}
