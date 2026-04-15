import { useQuery } from '@tanstack/react-query'
import { deliverabilityQueries } from '#hooks/api/query-keys/deliverability-keys'

/**
 * Admin-only hook: trailing-window email deliverability aggregates.
 * Pass `days` in the 1..365 range (enforced at the RPC layer).
 */
export function useDeliverabilityStats(days: number = 30) {
	return useQuery(deliverabilityQueries.stats(days))
}
