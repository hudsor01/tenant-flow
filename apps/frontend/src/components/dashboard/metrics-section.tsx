'use client'

import { MetricsCardSkeleton } from '#components/charts/metrics-card-skeleton'
// import { SectionCards } from '../../../../app/(protected)/manage/SectionCards'
import { useDashboardStats } from '#hooks/api/use-dashboard'

/**
 * MetricsSection - Single Responsibility: Display key metrics cards
 *
 * Handles its own data fetching and loading states for metrics display
 */
export function MetricsSection() {
	// Focused data fetching for metrics only
	const { isLoading, error } = useDashboardStats()

	if (isLoading) {
		return (
			<div
				className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
			>
				<div className="mx-auto max-w-400 py-4">
					<div className="grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 gap-4 px-6">
						{Array.from({ length: 6 }).map((_, index) => (
							<MetricsCardSkeleton key={index} />
						))}
					</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="border-b bg-background px-4 py-6 lg:px-6 lg:py-8">
				<div className="mx-auto max-w-400 flex justify-center">
					<div className="text-center">
						<p className="text-sm text-muted-foreground">
							Unable to load metrics
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
		>
			<div className="mx-auto max-w-400 py-4">
				{/* <SectionCards stats={stats} /> */}
			</div>
		</div>
	)
}
