'use client'

import { SectionCards } from '@/components/dashboard-01/section-cards'
import { useDashboardStats, usePropertyStats, useLeaseStats } from '@/hooks/api/use-dashboard'
import { MetricsCardSkeleton } from '@/components/charts/metrics-card-skeleton'

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
	const isLoading = dashboardStats.isLoading || propertyStats.isLoading || leaseStats.isLoading
	const error = dashboardStats.error || propertyStats.error || leaseStats.error

	if (isLoading) {
		return (
			<div
				className="border-b bg-background"
				style={{
					padding: 'var(--dashboard-content-padding)',
					borderColor: 'var(--color-fill-tertiary)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px]"
					style={{
						paddingTop: 'var(--spacing-4)',
						paddingBottom: 'var(--spacing-4)'
					}}
				>
					<div
						className="grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4"
						style={{
							gap: 'var(--dashboard-card-gap)',
							padding: '0 var(--dashboard-content-padding)'
						}}
					>
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
						<p className="text-sm text-muted-foreground">Unable to load metrics</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="border-b bg-background"
			style={{
				padding: 'var(--dashboard-content-padding)',
				borderColor: 'var(--color-fill-tertiary)'
			}}
		>
			<div
				className="mx-auto max-w-[1600px]"
				style={{
					paddingTop: 'var(--spacing-4)',
					paddingBottom: 'var(--spacing-4)'
				}}
			>
				<SectionCards
					dashboardStats={dashboardStats.data}
					propertyStats={propertyStats.data}
					leaseStats={leaseStats.data}
				/>
			</div>
		</div>
	)
}