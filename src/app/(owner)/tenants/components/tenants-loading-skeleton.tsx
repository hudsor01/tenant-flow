import { Skeleton } from '#components/ui/skeleton'

export function TenantsLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
			{/* Stats skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			{/* Quick actions skeleton */}
			<div className="flex gap-3">
				{[1, 2, 3, 4].map(i => (
					<Skeleton key={i} className="h-16 w-40 rounded-lg" />
				))}
			</div>
			{/* Table skeleton */}
			<Skeleton className="h-96 rounded-lg" />
		</div>
	)
}
