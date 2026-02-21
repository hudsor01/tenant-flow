'use client'

import { Skeleton } from '#components/ui/skeleton'

export function PayoutsLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-24" />
			</div>
			{/* Stats skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
			{/* Tables skeleton */}
			<div className="space-y-6">
				<Skeleton className="h-80 rounded-lg" />
				<Skeleton className="h-80 rounded-lg" />
			</div>
		</div>
	)
}
