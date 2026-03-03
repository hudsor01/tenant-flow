'use client'

import { Skeleton } from '#components/ui/skeleton'

/**
 * Dashboard Section Skeletons
 *
 * Dedicated loading states for each dashboard section.
 * Used with React 19.2 Suspense boundaries for progressive loading.
 */

/** Stats cards skeleton - 4 metric cards */
export function StatsSkeleton() {
	return (
		<section className="mb-6">
			<Skeleton className="h-4 w-24 mb-4" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="bg-card border border-border rounded-lg p-4">
						<div className="flex items-center justify-between mb-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-12" />
						</div>
						<div className="flex items-end justify-between">
							<Skeleton className="h-8 w-16" />
							<div className="flex items-end gap-0.5 h-6">
								{[...Array(6)].map((_, j) => (
									<Skeleton
										key={j}
										className="w-1 rounded-full"
										style={{ height: `${20 + ((j * 17 + i * 23) % 80)}%` }}
									/>
								))}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	)
}

/** Revenue chart skeleton - aligned with design-os 360px height */
export function ChartSkeleton() {
	return (
		<div className="flex-1 bg-card border border-border rounded-lg p-5 flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<div>
					<Skeleton className="h-6 w-40 mb-1" />
					<Skeleton className="h-4 w-56" />
				</div>
			</div>
			{/* 360px chart height to match RevenueChartSection */}
			<div className="flex-1 min-h-[360px] flex items-end gap-3 pb-6 pt-4">
				{[...Array(6)].map((_, i) => (
					<div key={i} className="flex-1 flex flex-col items-center">
						<Skeleton
							className="w-full rounded-t-md"
							style={{ height: `${40 + ((i * 23) % 60)}%` }}
						/>
						<Skeleton className="w-10 h-4 mt-3" />
					</div>
				))}
			</div>
		</div>
	)
}

/** Quick actions skeleton */
export function QuickActionsSkeleton() {
	return (
		<div className="lg:w-1/4 bg-card border border-border rounded-lg p-5">
			<Skeleton className="h-6 w-28 mb-4" />
			<div className="space-y-2">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-3 p-3 rounded-lg border border-border"
					>
						<Skeleton className="w-9 h-9 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-4 w-24 mb-1" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

/** Activity feed skeleton */
export function ActivitySkeleton() {
	return (
		<div className="bg-card border border-border rounded-lg p-5">
			<Skeleton className="h-6 w-32 mb-4" />
			<div className="space-y-3">
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="flex items-start gap-3 py-2 border-b border-border last:border-0"
					>
						<Skeleton className="w-8 h-8 rounded-full" />
						<div className="flex-1">
							<Skeleton className="h-4 w-48 mb-1" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

/** Property performance table skeleton */
export function PropertyTableSkeleton() {
	return (
		<div className="bg-card border border-border rounded-lg p-5">
			<Skeleton className="h-6 w-40 mb-4" />
			<div className="space-y-2">
				{/* Table header */}
				<div className="grid grid-cols-5 gap-4 pb-2 border-b border-border">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
				{/* Table rows */}
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="grid grid-cols-5 gap-4 py-3 border-b border-border last:border-0"
					>
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-12" />
					</div>
				))}
			</div>
		</div>
	)
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
	return (
		<div className="p-6 lg:p-8 min-h-full">
			{/* Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<Skeleton className="h-8 w-32 mb-1" />
					<Skeleton className="h-4 w-24" />
				</div>
				<Skeleton className="h-9 w-16" />
			</div>

			{/* Stats */}
			<StatsSkeleton />

			{/* Chart Section */}
			<section className="bg-card/30 border border-border/50 rounded-lg p-6">
				<div className="flex flex-col lg:flex-row gap-6">
					<ChartSkeleton />
					<QuickActionsSkeleton />
				</div>
			</section>
		</div>
	)
}
