import { Skeleton } from "#components/ui/skeleton";

export function LeaseDetailsSkeleton() {
	return (
		<div className="@container/lease-detail space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-24" />
					<Skeleton className="h-9 w-24" />
				</div>
			</div>
			{/* The stat row's columns (66.2-39 fix round 4, Part 8c), so the loaded row does not reflow (the lease page's key metrics). */}
			<div className="@container/lease-metrics">
				<div className="grid grid-cols-1 @min-[22.5rem]/lease-metrics:grid-cols-2 @min-[45.5rem]/lease-metrics:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
			</div>
			{/* The page's columns (66.2-39 fix round 4, Part 8e). */}
			<div className="grid grid-cols-1 gap-6 @min-[56rem]/lease-detail:grid-cols-3">
				<div className="@min-[56rem]/lease-detail:col-span-2">
					<Skeleton className="h-96" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-32" />
				</div>
			</div>
		</div>
	);
}
