'use client'

import { Skeleton } from '#components/ui/skeleton'

export function FinancialAnalyticsSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-7 w-48 mb-2" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-28 mb-2" />
						<Skeleton className="h-5 w-16" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-40 mb-2" />
					<Skeleton className="h-4 w-56 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="space-y-6">
					<div className="bg-card border border-border rounded-lg p-6">
						<Skeleton className="h-5 w-36 mb-2" />
						<Skeleton className="h-4 w-24 mb-4" />
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={j} className="h-4 w-full" />
							))}
						</div>
					</div>
					<div className="bg-card border border-border rounded-lg p-6">
						<Skeleton className="h-5 w-36 mb-2" />
						<Skeleton className="h-4 w-24 mb-4" />
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={j} className="h-4 w-full" />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
