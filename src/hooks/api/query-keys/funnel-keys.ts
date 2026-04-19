/**
 * Onboarding Funnel Analytics Query Options
 *
 * Reads `get_funnel_stats(p_from timestamptz, p_to timestamptz)` RPC defined
 * in `supabase/migrations/20260415193248_get_funnel_stats_rpc.sql`.
 *
 * Cohort semantics: owners who signed up in [p_from, p_to] — their funnel
 * progression is tracked to the present day (D2 signup-cohort). See
 * 44-DECISIONS.md.
 *
 * Admin-only RPC — non-admin callers receive an 'Unauthorized' PostgREST
 * error, never stats.
 */
import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type {
	FunnelStats,
	FunnelStep,
	FunnelStepName
} from '#types/analytics'

// Matches the CHECK constraint in 20260415193247_onboarding_funnel_events_schema.sql.
const ALLOWED_STEPS: readonly FunnelStepName[] = [
	'signup',
	'first_property',
	'first_tenant'
] as const

function isFunnelStepName(value: unknown): value is FunnelStepName {
	return (
		typeof value === 'string' &&
		(ALLOWED_STEPS as readonly string[]).includes(value)
	)
}

function numberOrNull(value: unknown): number | null {
	if (value === null || value === undefined) return null
	const n = Number(value)
	return Number.isFinite(n) ? n : null
}

/**
 * Map the RPC's jsonb return shape to the domain type. Rejects rows whose
 * `step` key is not in ALLOWED_STEPS (drops silently rather than asserting
 * — the DB CHECK constraint is authoritative).
 */
export function mapFunnelStats(raw: Record<string, unknown>): FunnelStats {
	const stepsRaw = Array.isArray(raw.steps) ? raw.steps : []
	const steps: FunnelStep[] = stepsRaw
		.map((s): FunnelStep | null => {
			if (!s || typeof s !== 'object') return null
			const row = s as Record<string, unknown>
			if (!isFunnelStepName(row.step)) return null
			return {
				step: row.step,
				stepOrder: Number(row.step_order ?? 0),
				count: Number(row.count ?? 0),
				conversionRateFromPrior: numberOrNull(row.conversion_rate_from_prior),
				conversionRateFromSignup: numberOrNull(
					row.conversion_rate_from_signup
				),
				medianDaysFromPrior: numberOrNull(row.median_days_from_prior),
				medianDaysFromSignup: numberOrNull(row.median_days_from_signup)
			}
		})
		.filter((s): s is FunnelStep => s !== null)
		.sort((a, b) => a.stepOrder - b.stepOrder)

	return {
		from: typeof raw.from === 'string' ? raw.from : '',
		to: typeof raw.to === 'string' ? raw.to : '',
		cohortLabel: typeof raw.cohort_label === 'string' ? raw.cohort_label : '',
		mediansComputedAt:
			typeof raw.medians_computed_at === 'string'
				? raw.medians_computed_at
				: '',
		steps
	}
}

export const funnelKeys = {
	all: ['funnel'] as const,
	stats: (from: string, to: string) =>
		[...funnelKeys.all, 'stats', from, to] as const
}

export const funnelQueries = {
	/**
	 * Admin-only: signup-cohort funnel stats for [from, to].
	 * Callers compute the window (default: today-90d .. today).
	 */
	stats: (from: string, to: string) =>
		queryOptions({
			queryKey: funnelKeys.stats(from, to),
			queryFn: async (): Promise<FunnelStats | null> => {
				const supabase = createClient()
				const { data, error } = await supabase.rpc('get_funnel_stats', {
					p_from: from,
					p_to: to
				})
				if (error) handlePostgrestError(error, 'funnel-stats')
				if (!data || typeof data !== 'object' || Array.isArray(data)) {
					return null
				}
				return mapFunnelStats(data as Record<string, unknown>)
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			retry: false
		})
}
