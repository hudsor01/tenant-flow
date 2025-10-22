import { cn } from '@/lib/utils'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricsCardSkeletonProps {
	className?: string
}

export function MetricsCardSkeleton({ className }: MetricsCardSkeletonProps) {
	return (
		<Card
			className={cn(
			'dashboard-metric-card border-l-[3px] transition-all duration-200 min-h-[120px] p-6 border-l-[var(--color-metric-neutral)] bg-[var(--color-metric-neutral-bg)]',
			className
		)}
		>
			<CardHeader className="p-0 gap-4">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="w-20 h-4 rounded-sm" />
					<Skeleton className="size-10 rounded-lg" />
				</div>
				<Skeleton className="w-[60px] h-8 rounded-md" />
			</CardHeader>
			<CardFooter className="flex-col items-start p-0 pt-4 gap-2">
				<Skeleton className="w-[120px] h-3.5 rounded-sm" />
			</CardFooter>
		</Card>
	)
}
