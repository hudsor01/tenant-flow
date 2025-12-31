'use client'

import { Skeleton } from '#components/ui/skeleton'

export function MaintenanceDetailsSkeleton() {
	return (
		<div className="grid gap-6 lg:grid-cols-3">
			<div className="lg:col-span-2 space-y-6">
				<Skeleton className="h-48" />
				<Skeleton className="h-64" />
			</div>
			<div className="space-y-6">
				<Skeleton className="h-48" />
				<Skeleton className="h-48" />
			</div>
		</div>
	)
}
