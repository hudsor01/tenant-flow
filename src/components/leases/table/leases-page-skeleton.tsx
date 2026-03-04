'use client'

import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'

export function LeasesPageSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				{/* Header Skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-32 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-32 rounded-sm" />
				</div>
			</BlurFade>

			{/* Stats Skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[1, 2, 3, 4].map(i => (
					<div key={i} className="bg-card border border-border rounded-sm p-4">
						<Skeleton className="h-4 w-24 mb-2" />
						<div className="flex items-end justify-between">
							<Skeleton className="h-8 w-12" />
							<Skeleton className="h-9 w-9 rounded-sm" />
						</div>
					</div>
				))}
			</div>

			{/* Table Skeleton */}
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					<Skeleton className="h-9 flex-1 max-w-sm rounded-sm" />
					<Skeleton className="h-9 w-32 rounded-sm" />
				</div>
				<div className="divide-y divide-border">
					{[1, 2, 3, 4, 5].map(i => (
						<div key={i} className="px-4 py-3 flex items-center gap-4">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-40 hidden lg:block" />
							<Skeleton className="h-6 w-16" />
							<div className="ml-auto flex gap-1">
								<Skeleton className="h-8 w-8 rounded-sm" />
								<Skeleton className="h-8 w-8 rounded-sm" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
