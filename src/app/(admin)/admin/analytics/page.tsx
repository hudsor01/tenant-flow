import type { Metadata } from 'next'
import { createClient } from '#lib/supabase/server'
import { DeliverabilityTable } from '#components/admin/deliverability-table'
import { FunnelChartClient } from '#components/admin/funnel-chart'
import { mapDeliverabilityRow } from '#hooks/api/query-keys/deliverability-keys'
import { mapFunnelStats } from '#hooks/api/query-keys/funnel-keys'
import type { DeliverabilityStats, FunnelStats } from '#types/analytics'

export const metadata: Metadata = {
	title: 'Admin Analytics | TenantFlow'
}

// 90 days of signup cohort — matches the default window noted in
// 44-03-PLAN.md and gives the funnel enough volume to read meaningfully.
const FUNNEL_WINDOW_DAYS = 90
const DELIVERABILITY_WINDOW_DAYS = 30

export default async function AdminAnalyticsPage() {
	const supabase = await createClient()

	const now = new Date()
	const funnelFrom = new Date(
		now.getTime() - FUNNEL_WINDOW_DAYS * 86_400_000
	).toISOString()
	const funnelTo = now.toISOString()

	const [deliverabilityResult, funnelResult] = await Promise.all([
		supabase.rpc('get_deliverability_stats', {
			p_days: DELIVERABILITY_WINDOW_DAYS
		}),
		supabase.rpc('get_funnel_stats', {
			p_from: funnelFrom,
			p_to: funnelTo
		})
	])

	const deliverability: DeliverabilityStats[] = Array.isArray(
		deliverabilityResult.data
	)
		? deliverabilityResult.data.map(row =>
				mapDeliverabilityRow(row as Record<string, unknown>)
			)
		: []

	const funnelRaw = funnelResult.data
	const funnel: FunnelStats | null =
		funnelRaw && typeof funnelRaw === 'object' && !Array.isArray(funnelRaw)
			? mapFunnelStats(funnelRaw as Record<string, unknown>)
			: null

	return (
		<div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
			<div>
				<h2 className="text-2xl font-semibold text-foreground">
					Platform Analytics
				</h2>
				<p className="text-sm text-muted-foreground">
					Email deliverability (rolling 30 days) and owner onboarding funnel.
				</p>
			</div>
			<section aria-labelledby="deliverability-heading">
				<h3
					id="deliverability-heading"
					className="text-lg font-semibold mb-4 text-foreground"
				>
					Email Deliverability
				</h3>
				<DeliverabilityTable data={deliverability} />
			</section>
			<section aria-labelledby="funnel-heading">
				<h3
					id="funnel-heading"
					className="text-lg font-semibold mb-4 text-foreground"
				>
					Onboarding Funnel
				</h3>
				{funnel && funnel.cohortLabel ? (
					<p className="text-xs text-muted-foreground mb-2">
						Cohort: {funnel.cohortLabel}
					</p>
				) : null}
				<FunnelChartClient data={funnel} />
			</section>
		</div>
	)
}
