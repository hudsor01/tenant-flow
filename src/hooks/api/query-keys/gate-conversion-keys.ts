/**
 * Gate Conversion Analytics Query Options
 *
 * Reads `get_gate_conversion_stats(p_days integer default 30)` RPC defined in
 * `supabase/migrations/20260419120000_create_gate_events.sql`.
 *
 * Admin-only RPC — raises 'Unauthorized' for non-admin callers. Drives the
 * admin analytics page paywall-conversion table. Joins `gate_events` (written
 * by `_shared/tier-gate.ts` on every 402) against `stripe.subscriptions`
 * metadata.source to compute per-feature conversion rates.
 */
import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { GateConversionStats } from '#types/analytics'

export function mapGateConversionRow(
	raw: Record<string, unknown>
): GateConversionStats {
	return {
		feature: typeof raw.feature === 'string' ? raw.feature : 'unknown',
		gateHits: Number(raw.gate_hits ?? 0),
		distinctUsersHit: Number(raw.distinct_users_hit ?? 0),
		upgradesFromGate: Number(raw.upgrades_from_gate ?? 0),
		// RPC returns null when distinct_users_hit is 0 (no denominator).
		conversionRate:
			raw.conversion_rate === null || raw.conversion_rate === undefined
				? null
				: Number(raw.conversion_rate)
	}
}

export const gateConversionKeys = {
	all: ['gate-conversion'] as const,
	stats: (days: number) =>
		[...gateConversionKeys.all, 'stats', days] as const
}

export const gateConversionQueries = {
	stats: (days: number = 30) =>
		queryOptions({
			queryKey: gateConversionKeys.stats(days),
			queryFn: async (): Promise<GateConversionStats[]> => {
				const supabase = createClient()
				const { data, error } = await supabase.rpc(
					'get_gate_conversion_stats',
					{ p_days: days }
				)
				if (error) handlePostgrestError(error, 'gate-conversion-stats')
				if (!Array.isArray(data)) return []
				return data.map(row =>
					mapGateConversionRow(row as Record<string, unknown>)
				)
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			retry: false
		})
}
