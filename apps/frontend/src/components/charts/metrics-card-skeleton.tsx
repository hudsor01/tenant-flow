import { Card, CardHeader, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MetricsCardSkeletonProps {
	className?: string
}

export function MetricsCardSkeleton({ className }: MetricsCardSkeletonProps) {
	return (
		<Card
			className={cn(
				'dashboard-metric-card border-l-[3px] transition-all duration-200',
				className
			)}
			style={{
				borderLeftColor: 'var(--color-metric-neutral)',
				backgroundColor: 'var(--color-metric-neutral-bg)',
				minHeight: '120px',
				padding: 'var(--spacing-6)'
			}}
		>
			<CardHeader
				style={{
					padding: '0',
					gap: 'var(--spacing-4)'
				}}
			>
				<div
					className="flex items-center justify-between"
					style={{ gap: 'var(--spacing-3)' }}
				>
					<Skeleton
						style={{
							width: '80px',
							height: '16px',
							borderRadius: 'var(--radius-sm)'
						}}
					/>
					<Skeleton
						style={{
							width: '40px',
							height: '40px',
							borderRadius: 'var(--radius-lg)'
						}}
					/>
				</div>
				<Skeleton
					style={{
						width: '60px',
						height: '32px',
						borderRadius: 'var(--radius-md)'
					}}
				/>
			</CardHeader>
			<CardFooter
				className="flex-col items-start"
				style={{
					padding: '0',
					paddingTop: 'var(--spacing-4)',
					gap: 'var(--spacing-2)'
				}}
			>
				<Skeleton
					style={{
						width: '120px',
						height: '14px',
						borderRadius: 'var(--radius-sm)'
					}}
				/>
			</CardFooter>
		</Card>
	)
}