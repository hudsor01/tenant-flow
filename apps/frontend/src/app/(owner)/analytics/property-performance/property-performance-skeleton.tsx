'use client'

import { Skeleton } from '#components/ui/skeleton'

export function PropertyPerformanceSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col gap-2 mb-6">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-5 w-96" />
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
