import { Skeleton } from '#components/ui/skeleton'

/**
 * Dashboard Loading Skeleton
 * Tour target included so tour can initialize while content loads
 */
export function DashboardLoadingSkeleton() {
	return (
		<div data-testid="dashboard-stats" className="flex flex-1 flex-col gap-6 p-6">
			{/* Header skeleton */}
			<div>
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-72 mt-2" />
			</div>

			{/* Main content skeleton */}
			<div className="grid gap-6 lg:grid-cols-4">
				{/* Chart skeleton - 75% */}
				<div className="lg:col-span-3 border rounded-lg p-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-4" />
					<Skeleton className="h-[400px] w-full" />
				</div>

				{/* Quick actions skeleton - 25% */}
				<div className="border rounded-lg p-6">
					<Skeleton className="h-6 w-32 mb-2" />
					<Skeleton className="h-4 w-24 mb-4" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center gap-3 p-3 border rounded-lg"
							>
								<Skeleton className="h-9 w-9 rounded-md" />
								<div className="flex-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-36 mt-1" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Portfolio table skeleton */}
			<div className="border rounded-lg overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center gap-3">
					<Skeleton className="h-9 w-64" />
					<div className="flex items-center gap-3 ml-auto">
						<Skeleton className="h-9 w-[140px]" />
						<Skeleton className="h-9 w-[140px]" />
					</div>
				</div>
				<div className="p-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-4 py-3 border-b last:border-0"
						>
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
