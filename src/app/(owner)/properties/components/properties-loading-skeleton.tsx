import { Skeleton } from "#components/ui/skeleton";

export function PropertiesLoadingSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-6">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
			{/* Stats skeleton: the stat row's columns (PropertyStatsSection). */}
			<div className="@container/property-stats">
				<div className="grid grid-cols-1 @min-[25rem]/property-stats:grid-cols-2 @min-[51rem]/property-stats:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
			</div>
			{/* Portfolio skeleton */}
			<Skeleton className="h-96 rounded-lg" />
		</div>
	);
}
