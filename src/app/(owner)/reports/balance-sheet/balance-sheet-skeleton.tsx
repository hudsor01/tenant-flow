import { Skeleton } from "#components/ui/skeleton";

export function BalanceSheetSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-40 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			{/* The stat row's columns and spans (66.2-39 fix round 4, Part 8c), so
			    the loaded row does not reflow. */}
			<div className="@container/balance-stats mb-8">
				<div className="grid grid-cols-1 @min-[33rem]/balance-stats:grid-cols-2 @min-[50rem]/balance-stats:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton
							key={i}
							className={`h-28 rounded-lg ${i === 3 ? "@min-[33rem]/balance-stats:col-span-2 @min-[50rem]/balance-stats:col-span-1" : ""}`}
						/>
					))}
				</div>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{[1, 2].map((i) => (
					<Skeleton key={i} className="h-80 rounded-lg" />
				))}
			</div>
		</div>
	);
}
