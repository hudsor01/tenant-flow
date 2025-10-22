import { Skeleton } from '@/components/ui/skeleton'

interface ActivityFeedSkeletonProps {
	items?: number
}

export function ActivityFeedSkeleton({ items = 3 }: ActivityFeedSkeletonProps) {
	return (
		<div className="space-y-4">
			{Array.from({ length: items }).map((_, index) => (
				<div key={index} className="flex items-start gap-4 p-3 rounded-lg">
					{/* Activity Icon Skeleton */}
					<Skeleton className="size-10 rounded-full" />

					{/* Activity Content Skeleton */}
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 mb-2">
									<Skeleton className="w-[120px] h-4 rounded-sm" />
									<Skeleton className="w-[60px] h-5 rounded-full" />
								</div>
								<Skeleton className="mb-2 w-[180px] h-3.5 rounded-sm" />
								<Skeleton className="w-20 h-3 rounded-sm" />
							</div>
						</div>
					</div>
				</div>
			))}

			{/* View All Activities Button Skeleton */}
			<div className="pt-4 border-t">
				<Skeleton className="w-full h-10 rounded-md" />
			</div>
		</div>
	)
}
