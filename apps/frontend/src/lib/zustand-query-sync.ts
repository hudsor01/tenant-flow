/**
 * Zustand Query Sync
 * Synchronizes Zustand store with React Query cache
 */

import { type QueryClient } from '@tanstack/react-query'

export interface QuerySyncOptions {
	queryClient: QueryClient
	queryKey: string[]
	storePath?: string
}

/**
 * Creates a sync function for Zustand store with React Query
 */
export function createQuerySync<T>(options: QuerySyncOptions) {
	const { queryClient, queryKey } = options

	return {
		// Sync data from query cache to store
		syncFromQuery: (): T | undefined => {
			return queryClient.getQueryData<T>(queryKey)
		},

		// Sync data from store to query cache
		syncToQuery: (data: T) => {
			queryClient.setQueryData(queryKey, data)
		},

		// Invalidate query to trigger refetch
		invalidateQuery: () => {
			queryClient.invalidateQueries({ queryKey })
		},

		// Remove data from query cache
		removeQuery: () => {
			queryClient.removeQueries({ queryKey })
		}
	}
}

/**
 * Helper to create a subscription that syncs query data to store
 */
export function subscribeToQuery<T>(
	queryClient: QueryClient,
	queryKey: string[],
	callback: (data: T | undefined) => void
) {
	let currentData = queryClient.getQueryData<T>(queryKey)

	const unsubscribe = queryClient.getQueryCache().subscribe(event => {
		if (event.query.queryKey.join('.') === queryKey.join('.')) {
			const newData = queryClient.getQueryData<T>(queryKey)
			if (newData !== currentData) {
				currentData = newData
				callback(newData)
			}
		}
	})

	return unsubscribe
}
