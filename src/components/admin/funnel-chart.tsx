'use client'

import dynamic from 'next/dynamic'
import { TrendingDown } from 'lucide-react'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { ChartLoadingSkeleton } from '#components/shared/chart-loading-skeleton'
import type { FunnelStats, FunnelStepName } from '#types/analytics'

// Dynamic import isolates the recharts bundle so it does not ship in the
// admin layout SSR chunk. Matches the project Performance Convention
// (see CLAUDE.md + lease-insights-section.tsx).
const FunnelRenderer = dynamic(
	() => import('./funnel-renderer').then(m => m.FunnelRenderer),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

const STEP_LABELS: Record<FunnelStepName, string> = {
	signup: 'Signed Up',
	first_property: 'Added Property',
	first_tenant: 'Invited Tenant'
}

// Below this threshold a step is flagged destructive. 0.5 matches the
// rule-of-thumb ops signal the planning doc calls out.
const LOW_CONVERSION_THRESHOLD = 0.5

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(fraction: number): string {
	return `${(fraction * 100).toFixed(1)}%`
}

export function FunnelChartClient({ data }: { data: FunnelStats | null }) {
	if (!data || data.steps.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<TrendingDown
							className="size-6 text-muted-foreground"
							aria-hidden
						/>
					</EmptyMedia>
					<EmptyTitle>No funnel data yet</EmptyTitle>
					<EmptyDescription>
						Funnel events will appear once owners sign up and progress through
						onboarding.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = data.steps.map(step => ({
		name: STEP_LABELS[step.step],
		value: step.count,
		isLowConversion:
			step.conversionRateFromPrior !== null &&
			step.conversionRateFromPrior < LOW_CONVERSION_THRESHOLD
	}))

	return (
		<div className="rounded-md border border-border bg-background p-4">
			<FunnelRenderer data={chartData} />
			<dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
				{data.steps.map(step => {
					const rate = step.conversionRateFromPrior
					const low = rate !== null && rate < LOW_CONVERSION_THRESHOLD
					return (
						<div key={step.step}>
							<dt className="text-xs text-muted-foreground">
								{STEP_LABELS[step.step]}
							</dt>
							<dd className="text-lg font-semibold text-foreground">
								{formatCount(step.count)}
							</dd>
							{rate !== null ? (
								<dd
									className={
										low
											? 'text-xs text-destructive'
											: 'text-xs text-muted-foreground'
									}
								>
									{formatPercent(rate)} from prev step
								</dd>
							) : null}
						</div>
					)
				})}
			</dl>
		</div>
	)
}
