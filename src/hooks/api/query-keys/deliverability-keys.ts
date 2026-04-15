/**
 * Deliverability Analytics Query Options
 *
 * Reads `get_deliverability_stats(p_days integer default 30)` RPC defined in
 * `supabase/migrations/20260415193246_get_deliverability_stats_rpc.sql`.
 *
 * Admin-only RPC — callers must ensure the signed-in user is ADMIN or the
 * function will raise 'Unauthorized'. Drives the admin analytics page
 * deliverability table.
 */
import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { DeliverabilityStats } from '#types/analytics'

/**
 * Map a PostgREST row from `get_deliverability_stats` to the domain type.
 * The RPC returns sent_count/delivered_count/etc. and rates already multiplied
 * by 100 (percentage points, 0..100).
 */
export function mapDeliverabilityRow(
	raw: Record<string, unknown>
): DeliverabilityStats {
	return {
		templateTag:
			typeof raw.template_tag === 'string' ? raw.template_tag : 'unknown',
		sent: Number(raw.sent_count ?? 0),
		delivered: Number(raw.delivered_count ?? 0),
		opened: Number(raw.opened_count ?? 0),
		bounced: Number(raw.bounced_count ?? 0),
		complained: Number(raw.complained_count ?? 0),
		bouncePercent: Number(raw.bounce_rate ?? 0),
		complaintPercent: Number(raw.complaint_rate ?? 0)
	}
}

export const deliverabilityKeys = {
	all: ['deliverability'] as const,
	stats: (days: number) =>
		[...deliverabilityKeys.all, 'stats', days] as const
}

export const deliverabilityQueries = {
	/**
	 * Admin-only: per-template deliverability aggregates over the trailing
	 * p_days window (default 30, range 1..365).
	 */
	stats: (days: number = 30) =>
		queryOptions({
			queryKey: deliverabilityKeys.stats(days),
			queryFn: async (): Promise<DeliverabilityStats[]> => {
				const supabase = createClient()
				const { data, error } = await supabase.rpc(
					'get_deliverability_stats',
					{ p_days: days }
				)
				if (error) handlePostgrestError(error, 'deliverability-stats')
				if (!Array.isArray(data)) return []
				return data.map(row =>
					mapDeliverabilityRow(row as Record<string, unknown>)
				)
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			retry: false
		})
}
