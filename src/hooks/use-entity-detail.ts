/**
 * Generic entity detail hook factory.
 * Wraps useQuery with optional placeholderData from list caches.
 *
 * Replaces the hand-written pattern of:
 *   const queryClient = useQueryClient()
 *   return useQuery({ ...detailOptions, placeholderData: () => { ... } })
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'

/**
 * Config accepted by useEntityDetail. The queryOptions field accepts
 * the return value of a queryOptions() factory call directly.
 * We use Record<string, unknown> to accept the complex return type
 * of queryOptions() without fighting exactOptionalPropertyTypes.
 */
export interface EntityDetailConfig<T> {
	/** Return value from a queryOptions() factory — spread into useQuery */
	queryOptions: Record<string, unknown> & { queryKey: QueryKey }
	/** Query key prefix to search list caches for placeholderData */
	listQueryKey?: readonly unknown[]
	/** Entity ID to match within list cache data */
	id: string
	/** Phantom type anchor -- not read at runtime */
	_type?: T
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
	config: EntityDetailConfig<T>
) {
	// Always call useQueryClient unconditionally (React Compiler requires stable hook calls)
	const queryClient = useQueryClient()

	const { queryOptions: opts, listQueryKey, id } = config

	if (listQueryKey) {
		return useQuery({
			...(opts as Parameters<typeof useQuery>[0]),
			placeholderData: () =>
				findInListCaches<T>(
					queryClient.getQueriesData<{ data?: T[] } | T[]>({
						queryKey: listQueryKey
					}),
					id
				)
		})
	}

	return useQuery(opts as Parameters<typeof useQuery>[0])
}
