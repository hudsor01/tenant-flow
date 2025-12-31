'use client'

import { Skeleton } from '#components/ui/skeleton'

export function LeaseDetailsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-24" />
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-24" />
				))}
			</div>
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Skeleton className="h-96" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-32" />
				</div>
			</div>
		</div>
	)
}
