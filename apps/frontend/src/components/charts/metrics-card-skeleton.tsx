import { cn } from '#lib/utils'
import { Card, CardFooter, CardHeader } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'

interface MetricsCardSkeletonProps {
	className?: string
}

export function MetricsCardSkeleton({ className }: MetricsCardSkeletonProps) {
	return (
		<Card
			className={cn(
			'dashboard-metric-card border-l-[3px] transition-all duration-200 min-h-30 p-6 border-l-muted-foreground bg-muted',
			className
		)}
		>
			<CardHeader className="p-0 gap-4">
				<div className="flex items-center justify-between gap-3">
					<Skeleton className="w-20 h-4 rounded-sm" />
					<Skeleton className="size-10 rounded-lg" />
				</div>
				<Skeleton className="w-15 h-8 rounded-md" />
			</CardHeader>
			<CardFooter className="flex-col items-start p-0 pt-4 gap-2">
				<Skeleton className="w-30 h-3.5 rounded-sm" />
			</CardFooter>
		</Card>
	)
}
