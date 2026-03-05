/**
 * Analytics Query Keys & Options
 * Shared query factories for analytics RPCs used across multiple hooks.
 *
 * Deduplicates get_revenue_trends_optimized which was previously called
 * from lease-keys.ts (3x), use-owner-dashboard.ts (2x).
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const analyticsKeys = {
	all: ['analytics'] as const,
	revenueTrends: (months: number) =>
		[...analyticsKeys.all, 'revenue-trends', months] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Shared revenue trends queryOptions factory.
 * Single source of truth for get_revenue_trends_optimized RPC.
 * Used by owner dashboard financial charts, lease analytics, and reports.
 */
export const revenueTrendsQuery = (params?: { months?: number }) => {
	const months = params?.months ?? 12
	return queryOptions({
		queryKey: analyticsKeys.revenueTrends(months),
		queryFn: async (): Promise<Record<string, unknown>> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')
			const { data, error } = await supabase.rpc(
				'get_revenue_trends_optimized',
				{ p_user_id: user.id, p_months: months }
			)
			if (error) handlePostgrestError(error, 'analytics')
			return (data ?? {}) as Record<string, unknown>
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}
