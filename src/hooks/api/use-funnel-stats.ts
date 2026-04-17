import { useQuery } from '@tanstack/react-query'
import { funnelQueries } from '#hooks/api/query-keys/funnel-keys'

/**
 * Admin-only hook: signup-cohort onboarding funnel stats.
 *
 * Callers pass ISO timestamptz strings; typical defaults are
 *   from = new Date(Date.now() - 90 * 86_400_000).toISOString()
 *   to   = new Date().toISOString()
 * — see 44-DECISIONS.md D2 for signup-cohort semantics.
 */
export function useFunnelStats(from: string, to: string) {
	return useQuery(funnelQueries.stats(from, to))
}
