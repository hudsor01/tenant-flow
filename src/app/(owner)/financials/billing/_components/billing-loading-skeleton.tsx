'use client'

import { Skeleton } from '#components/ui/skeleton'

export function BillingLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-48 mb-2" />
					<Skeleton className="h-4 w-72" />
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{[1, 2, 3].map(i => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
			<Skeleton className="h-64 rounded-lg" />
		</div>
	)
}
