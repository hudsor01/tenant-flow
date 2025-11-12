/**
 * Centralized TanStack Query cache timing constants
 *
 * Apply consistently across all 40+ API hooks per CLAUDE.md:
 * - Lists: 10 minutes (data changes infrequently)
 * - Details: 5 minutes (balance freshness and performance)
 * - Stats: 1 minute (real-time feel for dashboard)
 * - Real-time: 30 seconds (polling use cases)
 *
 * Usage:
 * @example
 * export function useTenants() {
 *   return useQuery({
 *     queryKey: ['tenants'],
 *     queryFn: () => fetch('/api/tenants'),
 *     ...QUERY_CACHE_TIMES.LIST
 *   })
 * }
 */
export const QUERY_CACHE_TIMES = {
	/** List views (tenants, properties, leases) - 10 minutes */
	LIST: {
		staleTime: 10 * 60 * 1000,
		gcTime: 15 * 60 * 1000
	},

	/** Detail views (single tenant, property, unit) - 5 minutes */
	DETAIL: {
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	},

	/** Dashboard statistics - 1 minute */
	STATS: {
		staleTime: 1 * 60 * 1000,
		gcTime: 5 * 60 * 1000
	},

	/** Real-time/polling data - 30 seconds */
	REALTIME: {
		staleTime: 30 * 1000,
		gcTime: 2 * 60 * 1000
	},

	/**
	 * Dashboard optimized - 5 minutes (PERF-004 fix)
	 * Stats are relatively static and don't require frequent polling
	 */
	DASHBOARD: {
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	}
} as const
