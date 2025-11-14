import { Skeleton } from '#components/ui/skeleton'

interface ActivityFeedSkeletonProps {
	items?: number
}

export function ActivityFeedSkeleton({ items = 3 }: ActivityFeedSkeletonProps) {
	return (
		<div className="dashboard-activity-feed">
			{Array.from({ length: items }).map((_, index) => (
				<div key={index} className="dashboard-activity-item">
					{/* Activity Icon Skeleton */}
					<Skeleton className="dashboard-activity-icon" />

					{/* Activity Content Skeleton */}
					<div className="min-w-0 flex-1 space-y-2">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-32 rounded-sm" />
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<Skeleton className="h-3.5 w-48 rounded-sm" />
						<Skeleton className="h-3 w-28 rounded-sm" />
					</div>
				</div>
			))}

			{/* View All Activities Button Skeleton */}
			<div className="dashboard-activity-footer">
				<Skeleton className="h-11 w-full rounded-lg" />
			</div>
		</div>
	)
}
