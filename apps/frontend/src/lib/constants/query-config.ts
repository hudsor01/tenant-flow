/**
 * TanStack Query Cache Configuration Constants
 *
 * Centralized cache times for consistent data freshness across the app.
 * All times are in milliseconds.
 *
 * Strategy:
 * - DETAIL: Short staleTime (5min) for frequently viewed single items
 * - LIST: Medium staleTime (10min) for paginated lists
 * - STATS: Medium staleTime (10min) for dashboard analytics
 * - REALTIME: No staleTime, auto-refetch every 30s
 * - SECURITY: Short staleTime (2min) for auth-related data
 */
export const QUERY_CACHE_TIMES = {
	/**
	 * Detail/single item queries (e.g., useProperty(id), useTenant(id))
	 * Used when viewing a specific entity
	 */
	DETAIL: {
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	},

	/**
	 * List queries (e.g., usePropertyList(), useTenantList())
	 * Used for paginated tables and list views
	 */
	LIST: {
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000 // 30 minutes
	},

	/**
	 * Statistics and analytics queries
	 * Used for dashboard widgets and summary cards
	 */
	STATS: {
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000 // 30 minutes
	},

	/**
	 * Real-time data queries
	 * Used for live updates (e.g., notifications, activity feeds)
	 */
	REALTIME: {
		staleTime: 0, // Always stale, refetch on mount
		refetchInterval: 30 * 1000 // 30 seconds
	},

	/**
	 * Security-sensitive queries (auth, session, user profile)
	 * Shorter staleTime for fresher auth state
	 */
	SECURITY: {
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000 // 5 minutes
	}
} as const
