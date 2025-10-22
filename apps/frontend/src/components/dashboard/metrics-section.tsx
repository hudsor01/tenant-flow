'use client'

import { MetricsCardSkeleton } from '@/components/charts/metrics-card-skeleton'
// import { SectionCards } from '../../../../app/(protected)/manage/SectionCards'
import {
	useDashboardStats,
	useLeaseStats,
	usePropertyStats
} from '@/hooks/api/use-dashboard'

/**
 * MetricsSection - Single Responsibility: Display key metrics cards
 *
 * Handles its own data fetching and loading states for metrics display
 */
export function MetricsSection() {
	// Focused data fetching for metrics only
	const dashboardStats = useDashboardStats()
	const propertyStats = usePropertyStats()
	const leaseStats = useLeaseStats()

	// Show loading state while any metrics data is fetching
	const isLoading =
		dashboardStats.isLoading || propertyStats.isLoading || leaseStats.isLoading
	const error = dashboardStats.error || propertyStats.error || leaseStats.error

	// Combine stats data for SectionCards
	// const stats = dashboardStats.data

	if (isLoading) {
		return (
			<div
				className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
			>
				<div className="mx-auto max-w-[1600px] py-4">
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
				<div className="mx-auto max-w-[1600px] flex justify-center">
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
			<div className="mx-auto max-w-[1600px] py-4">
				{/* <SectionCards stats={stats} /> */}
			</div>
		</div>
	)
}
