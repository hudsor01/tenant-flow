/**
 * Common React Query Patterns
 * Extracted patterns to reduce duplication while staying native to TanStack Query
 *
 * NO FACTORIES OR WRAPPERS - Direct TanStack Query usage only
 */

import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback } from 'react'

/**
 * Shared query configuration constants
 * Use these directly in your useQuery/useMutation calls
 */
export const QUERY_CONFIG = {
	/** Standard stale time for most queries */
	STALE_TIME: 5 * 60 * 1000, // 5 minutes
	/** Standard garbage collection time */
	GC_TIME: 10 * 60 * 1000, // 10 minutes
	/** Retry attempts */
	RETRY: 2,
	/** Retry delay with exponential backoff */
	retryDelay: (attemptIndex: number) =>
		Math.min(1000 * 2 ** attemptIndex, 30000)
} as const

/**
 * Mutation configuration constants
 */
export const MUTATION_CONFIG = {
	RETRY: 1,
	retryDelay: (attemptIndex: number) =>
		Math.min(1000 * 2 ** attemptIndex, 10000)
} as const

/**
 * Hook for optimistic list updates pattern
 * Provides rollback functionality for list mutations
 *
 * Usage:
 * ```tsx
 * const { addToList, updateInList, removeFromList, rollbackList } = useOptimisticList(['tenants'])
 *
 * // In mutation onMutate
 * const context = await addToList(newTenant)
 *
 * // In mutation onError
 * rollbackList(context.previous)
 * ```
 */
export function useOptimisticList<TItem extends { id: string }>(
	queryKey: QueryKey
) {
	const queryClient = useQueryClient()

	const addToList = useCallback(
		async (item: TItem) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<TItem[]>(queryKey)
			queryClient.setQueryData<TItem[]>(queryKey, old =>
				old ? [item, ...old] : [item]
			)
			return { previous }
		},
		[queryClient, queryKey]
	)

	const updateInList = useCallback(
		async (id: string, updates: Partial<TItem>) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<TItem[]>(queryKey)
			queryClient.setQueryData<TItem[]>(queryKey, old =>
				old
					? old.map(item =>
							item.id === id ? ({ ...item, ...updates } as TItem) : item
						)
					: old
			)
			return { previous }
		},
		[queryClient, queryKey]
	)

	const removeFromList = useCallback(
		async (id: string) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<TItem[]>(queryKey)
			queryClient.setQueryData<TItem[]>(queryKey, old =>
				old ? old.filter(item => item.id !== id) : old
			)
			return { previous }
		},
		[queryClient, queryKey]
	)

	const rollbackList = useCallback(
		(previous: TItem[] | undefined) => {
			if (previous) {
				queryClient.setQueryData(queryKey, previous)
			}
		},
		[queryClient, queryKey]
	)

	return { addToList, updateInList, removeFromList, rollbackList }
}

/**
 * Hook for optimistic detail updates pattern
 * Provides rollback functionality for single entity mutations
 *
 * Usage:
 * ```tsx
 * const { updateDetail, rollbackDetail } = useOptimisticDetail(['tenants', 'detail', id])
 *
 * // In mutation onMutate
 * const context = await updateDetail({ name: 'New Name' })
 *
 * // In mutation onError
 * rollbackDetail(context.previous)
 * ```
 */
export function useOptimisticDetail<TData>(queryKey: QueryKey) {
	const queryClient = useQueryClient()

	const updateDetail = useCallback(
		async (updates: Partial<TData>) => {
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<TData>(queryKey)
			queryClient.setQueryData<TData>(queryKey, old =>
				old ? { ...old, ...updates } : old
			)
			return { previous }
		},
		[queryClient, queryKey]
	)

	const rollbackDetail = useCallback(
		(previous: TData | undefined) => {
			if (previous) {
				queryClient.setQueryData(queryKey, previous)
			}
		},
		[queryClient, queryKey]
	)

	return { updateDetail, rollbackDetail }
}

/**
 * Hook for cache invalidation patterns
 * Provides common invalidation operations
 *
 * Usage:
 * ```tsx
 * const { invalidate, invalidateMultiple, refetch } = useCacheInvalidation()
 *
 * // Invalidate single query
 * await invalidate(['tenants', 'list'])
 *
 * // Invalidate multiple queries
 * await invalidateMultiple([['tenants'], ['leases']])
 *
 * // Refetch query immediately
 * await refetch(['tenants', 'detail', id])
 * ```
 */
export function useCacheInvalidation() {
	const queryClient = useQueryClient()

	const invalidate = useCallback(
		async (queryKey: QueryKey) => {
			await queryClient.invalidateQueries({ queryKey })
		},
		[queryClient]
	)

	const invalidateMultiple = useCallback(
		async (queryKeys: QueryKey[]) => {
			await Promise.all(
				queryKeys.map(queryKey => queryClient.invalidateQueries({ queryKey }))
			)
		},
		[queryClient]
	)

	const refetch = useCallback(
		async (queryKey: QueryKey) => {
			await queryClient.refetchQueries({ queryKey })
		},
		[queryClient]
	)

	const removeQuery = useCallback(
		(queryKey: QueryKey) => {
			queryClient.removeQueries({ queryKey })
		},
		[queryClient]
	)

	return { invalidate, invalidateMultiple, refetch, removeQuery }
}

/**
 * Hook for prefetching queries
 * Use for hover/focus prefetching patterns
 *
 * Usage:
 * ```tsx
 * const { prefetchQuery } = usePrefetch()
 *
 * <Button
 *   onMouseEnter={() => prefetchQuery(['tenant', id], `/api/v1/tenants/${id}`)}
 *   onFocus={() => prefetchQuery(['tenant', id], `/api/v1/tenants/${id}`)}
 * >
 *   View Tenant
 * </Button>
 * ```
 */
export function usePrefetch() {
	const queryClient = useQueryClient()

	const prefetchQuery = useCallback(
		async (queryKey: QueryKey, fetcher: () => Promise<unknown>) => {
			await queryClient.prefetchQuery({
				queryKey,
				queryFn: fetcher,
				staleTime: QUERY_CONFIG.STALE_TIME
			})
		},
		[queryClient]
	)

	return { prefetchQuery }
}

/**
 * Hook for checking if data exists in cache
 * Useful for conditional rendering or logic
 *
 * Usage:
 * ```tsx
 * const { getCachedData, hasCache } = useQueryCache()
 *
 * const tenant = getCachedData<Tenant>(['tenants', 'detail', id])
 * const isInCache = hasCache(['tenants', 'detail', id])
 * ```
 */
export function useQueryCache() {
	const queryClient = useQueryClient()

	const getCachedData = useCallback(
		<TData>(queryKey: QueryKey): TData | undefined => {
			return queryClient.getQueryData<TData>(queryKey)
		},
		[queryClient]
	)

	const hasCache = useCallback(
		(queryKey: QueryKey): boolean => {
			return queryClient.getQueryData(queryKey) !== undefined
		},
		[queryClient]
	)

	const setCachedData = useCallback(
		<TData>(queryKey: QueryKey, data: TData) => {
			queryClient.setQueryData(queryKey, data)
		},
		[queryClient]
	)

	return { getCachedData, hasCache, setCachedData }
}

/**
 * Hook for synchronized multi-cache updates
 * Use when a mutation needs to update multiple related caches
 *
 * Usage:
 * ```tsx
 * const { updateMultipleCaches, rollbackMultipleCaches } = useMultiCacheUpdate()
 *
 * // In mutation onMutate
 * const context = await updateMultipleCaches([
 *   { queryKey: ['tenants', 'detail', id], updates: { name: 'New Name' } },
 *   { queryKey: ['tenants', 'list'], updates: (old) => old.map(t => t.id === id ? {...t, name: 'New Name'} : t) }
 * ])
 *
 * // In mutation onError
 * rollbackMultipleCaches(context.snapshots)
 * ```
 */
export function useMultiCacheUpdate() {
	const queryClient = useQueryClient()

	const updateMultipleCaches = useCallback(
		async <TData>(
			updates: Array<{
				queryKey: QueryKey
				updater: (old: TData | undefined) => TData | undefined
			}>
		) => {
			// Cancel all queries
			await Promise.all(
				updates.map(({ queryKey }) => queryClient.cancelQueries({ queryKey }))
			)

			// Snapshot all caches
			const snapshots = updates.map(({ queryKey }) => ({
				queryKey,
				data: queryClient.getQueryData<TData>(queryKey)
			}))

			// Update all caches
			updates.forEach(({ queryKey, updater }) => {
				queryClient.setQueryData<TData>(queryKey, updater)
			})

			return { snapshots }
		},
		[queryClient]
	)

	const rollbackMultipleCaches = useCallback(
		<TData>(
			snapshots: Array<{
				queryKey: QueryKey
				data: TData | undefined
			}>
		) => {
			snapshots.forEach(({ queryKey, data }) => {
				if (data !== undefined) {
					queryClient.setQueryData(queryKey, data)
				}
			})
		},
		[queryClient]
	)

	return { updateMultipleCaches, rollbackMultipleCaches }
}
