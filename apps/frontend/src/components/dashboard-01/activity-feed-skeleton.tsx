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
					<Skeleton
						style={{
							width: '40px',
							height: '40px',
							borderRadius: '50%'
						}}
					/>

					{/* Activity Content Skeleton */}
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 mb-2">
									<Skeleton
										style={{
											width: '120px',
											height: '16px',
											borderRadius: 'var(--radius-sm)'
										}}
									/>
									<Skeleton
										style={{
											width: '60px',
											height: '20px',
											borderRadius: 'var(--radius-full)'
										}}
									/>
								</div>
								<Skeleton
									className="mb-2"
									style={{
										width: '180px',
										height: '14px',
										borderRadius: 'var(--radius-sm)'
									}}
								/>
								<Skeleton
									style={{
										width: '80px',
										height: '12px',
										borderRadius: 'var(--radius-sm)'
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			))}

			{/* View All Activities Button Skeleton */}
			<div className="pt-4 border-t">
				<Skeleton
					className="w-full"
					style={{
						height: '40px',
						borderRadius: 'var(--radius-md)'
					}}
				/>
			</div>
		</div>
	)
}