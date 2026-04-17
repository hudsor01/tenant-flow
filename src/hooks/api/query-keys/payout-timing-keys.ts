/**
 * Payout Timing Query Options
 *
 * Reads `get_payout_timing_stats()` RPC defined in
 * `supabase/migrations/20260413120000_launch_readiness_instrumentation.sql`.
 *
 * Admin-only RPC — callers must ensure the signed-in user is ADMIN or the
 * function will raise 'Unauthorized'. Use the `enabled` flag to gate the query
 * by role. Drives the admin-facing PayoutTimingCard.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'

export interface PayoutTimingStats {
	windowDays: number
	paidCount: number
	failedCount: number
	pendingCount: number
	p50Hours: number | null
	p95Hours: number | null
	maxHours: number | null
	over48hCount: number
	totalVolume: number
}

function mapPayoutTimingStats(
	raw: Record<string, unknown> | null
): PayoutTimingStats {
	if (!raw) {
		return {
			windowDays: 30,
			paidCount: 0,
			failedCount: 0,
			pendingCount: 0,
			p50Hours: null,
			p95Hours: null,
			maxHours: null,
			over48hCount: 0,
			totalVolume: 0
		}
	}
	const numericOrNull = (v: unknown): number | null =>
		v === null || v === undefined ? null : Number(v)
	return {
		windowDays: Number(raw.window_days ?? 30),
		paidCount: Number(raw.paid_count ?? 0),
		failedCount: Number(raw.failed_count ?? 0),
		pendingCount: Number(raw.pending_count ?? 0),
		p50Hours: numericOrNull(raw.p50_hours),
		p95Hours: numericOrNull(raw.p95_hours),
		maxHours: numericOrNull(raw.max_hours),
		over48hCount: Number(raw.over_48h_count ?? 0),
		totalVolume: Number(raw.total_volume ?? 0)
	}
}

export const payoutTimingKeys = {
	all: ['payout-timing'] as const,
	stats: () => [...payoutTimingKeys.all, 'stats'] as const
}

export const payoutTimingQueries = {
	/**
	 * Admin-only: 30-day P50/P95/max payout duration stats.
	 * Pass `enabled: isAdmin` so non-admin users never call the RPC.
	 * 5 minute staleTime — underlying data updates only on Stripe payout webhooks.
	 */
	stats: (options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: payoutTimingKeys.stats(),
			queryFn: async (): Promise<PayoutTimingStats> => {
				const supabase = createClient()
				const { data, error } = await supabase.rpc('get_payout_timing_stats')
				if (error) handlePostgrestError(error, 'payout-timing-stats')
				const raw = (Array.isArray(data) ? data[0] : data) as
					| Record<string, unknown>
					| null
				return mapPayoutTimingStats(raw)
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: options?.enabled ?? true,
			retry: false
		})
}
