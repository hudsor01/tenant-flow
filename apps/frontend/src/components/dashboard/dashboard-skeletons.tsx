import { Card } from '@/components/ui/card'

export function StatsCardSkeleton() {
	return (
		<div
			className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-4 animate-pulse"
			style={{ gap: 'var(--spacing-3)' }}
		>
			{[...Array(4)].map((_, i) => (
				<Card
					key={i}
					className="card-glass-premium flex items-center justify-center"
					style={{
						background: 'var(--color-fill-tertiary)',
						borderColor: 'var(--color-separator)',
						padding: 'var(--spacing-6)',
						aspectRatio: '16/9'
					}}
				>
					<div className="text-center w-full">
						<div
							className="rounded-lg bg-muted mx-auto mb-2"
							style={{
								width: 'var(--spacing-8)',
								height: 'var(--spacing-8)'
							}}
						/>
						<div
							className="h-3 bg-muted rounded mx-auto mb-2"
							style={{ width: '60%' }}
						/>
						<div
							className="h-8 bg-muted rounded mx-auto"
							style={{ width: '40%' }}
						/>
					</div>
				</Card>
			))}
		</div>
	)
}

export function ActivitySkeleton() {
	return (
		<div className="animate-pulse space-y-4">
			{/* Chart Skeleton */}
			<Card className="p-6">
				<div className="h-6 bg-muted rounded w-32 mb-4" />
				<div className="h-64 bg-muted rounded" />
			</Card>

			{/* Activity Table Skeleton */}
			<Card className="p-6">
				<div className="h-6 bg-muted rounded w-40 mb-4" />
				<div className="space-y-3">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="flex items-center gap-4">
							<div className="h-8 w-8 bg-muted rounded-full" />
							<div className="flex-1 space-y-2">
								<div className="h-4 bg-muted rounded w-3/4" />
								<div className="h-3 bg-muted rounded w-1/2" />
							</div>
							<div className="h-4 bg-muted rounded w-20" />
						</div>
					))}
				</div>
			</Card>
		</div>
	)
}