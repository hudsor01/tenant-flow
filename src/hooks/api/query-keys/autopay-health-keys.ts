/**
 * Autopay Health Query Options
 *
 * Reads `get_autopay_health(uuid)` RPC defined in
 * `supabase/migrations/20260413120000_launch_readiness_instrumentation.sql`.
 *
 * The RPC returns a single JSON object with enrollment metrics and pg_cron
 * health. Used by the owner dashboard AutopayHealthCard.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'

export interface AutopayHealth {
	enrolledCount: number
	totalActiveLeases: number
	enrollmentRate: number
	lastRunAt: string | null
	lastRunSucceeded: boolean | null
	failures30d: number
}

/**
 * Safely map an untyped RPC row to AutopayHealth.
 * Keeps the boundary typed without `as unknown as` assertions.
 */
function mapAutopayHealth(raw: Record<string, unknown> | null): AutopayHealth {
	if (!raw) {
		return {
			enrolledCount: 0,
			totalActiveLeases: 0,
			enrollmentRate: 0,
			lastRunAt: null,
			lastRunSucceeded: null,
			failures30d: 0
		}
	}
	const lastRunSucceededRaw = raw.last_run_succeeded
	return {
		enrolledCount: Number(raw.enrolled_count ?? 0),
		totalActiveLeases: Number(raw.total_active_leases ?? 0),
		enrollmentRate: Number(raw.enrollment_rate ?? 0),
		lastRunAt: typeof raw.last_run_at === 'string' ? raw.last_run_at : null,
		lastRunSucceeded:
			typeof lastRunSucceededRaw === 'boolean' ? lastRunSucceededRaw : null,
		failures30d: Number(raw.failures_30d ?? 0)
	}
}

export const autopayHealthKeys = {
	all: ['autopay-health'] as const,
	detail: (ownerUserId: string) =>
		[...autopayHealthKeys.all, 'detail', ownerUserId] as const
}

export const autopayHealthQueries = {
	/**
	 * Fetch autopay enrollment + cron health for the signed-in owner.
	 * 5 minute staleTime — pg_cron runs infrequently.
	 */
	detail: () =>
		queryOptions({
			queryKey: autopayHealthKeys.all,
			queryFn: async (): Promise<AutopayHealth> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc('get_autopay_health', {
					p_owner_user_id: user.id
				})
				if (error) handlePostgrestError(error, 'autopay-health')
				const raw = (Array.isArray(data) ? data[0] : data) as
					| Record<string, unknown>
					| null
				return mapAutopayHealth(raw)
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		})
}
