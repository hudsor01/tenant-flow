/**
 * React Query Hydration Utilities
 * Server-to-client data transfer with type safety
 */

import type { DehydratedState } from '@tanstack/react-query'
import { QueryClient, dehydrate } from '@tanstack/react-query'

/**
 * Creates a QueryClient optimized for server-side rendering
 * Uses shorter stale/gc times since server renders are ephemeral
 */
export function createServerQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Server-side defaults - shorter times since queries are one-shot
				staleTime: 60 * 1000, // 1 minute
				gcTime: 5 * 60 * 1000, // 5 minutes
				retry: false, // Don't retry on server
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
				refetchOnMount: false
			}
		}
	})
}

/**
 * Dehydrates server QueryClient state for client hydration
 * Only includes successful queries to avoid hydrating errors
 */
export function dehydrateServerState(
	queryClient: QueryClient
): DehydratedState {
	return dehydrate(queryClient, {
		shouldDehydrateQuery: query => {
			// Only dehydrate successful queries
			return query.state.status === 'success'
		}
	})
}

/**
 * Helper to prefetch data on server and return dehydrated state
 * Usage in Server Components:
 *
 * const queryClient = createServerQueryClient()
 * await prefetchServerData(queryClient, ['users'], fetchUsers)
 * const dehydratedState = dehydrateServerState(queryClient)
 */
export async function prefetchServerData<T>(
	queryClient: QueryClient,
	queryKey: unknown[],
	queryFn: () => Promise<T>
): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey,
		queryFn
	})
}

/**
 * Helper to fetch multiple queries in parallel on server
 * Returns dehydrated state ready for client hydration
 */
export async function prefetchMultipleQueries(
	queries: Array<{
		queryKey: unknown[]
		queryFn: () => Promise<unknown>
	}>
): Promise<DehydratedState> {
	const queryClient = createServerQueryClient()

	// Prefetch all queries in parallel
	await Promise.all(
		queries.map(({ queryKey, queryFn }) =>
			queryClient.prefetchQuery({ queryKey, queryFn })
		)
	)

	return dehydrateServerState(queryClient)
}

/**
 * Type-safe wrapper for Next.js Server Components
 * Automatically handles server-side data fetching and hydration
 *
 * Example:
 * const HydratedPage = withServerHydration(
 *   async () => {
 *     return [
 *       { queryKey: ['users'], queryFn: fetchUsers },
 *       { queryKey: ['posts'], queryFn: fetchPosts }
 *     ]
 *   },
 *   PageComponent
 * )
 */
export function withServerHydration<P extends object>(
	getQueries: () => Promise<
		Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown> }>
	>,
	Component: React.ComponentType<P & { dehydratedState: DehydratedState }>
) {
	return async function HydratedComponent(props: P) {
		const queries = await getQueries()
		const dehydratedState = await prefetchMultipleQueries(queries)

		return <Component {...props} dehydratedState={dehydratedState} />
	}
}
