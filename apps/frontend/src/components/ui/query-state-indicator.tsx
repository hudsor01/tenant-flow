/**
 * Query State Indicator - Production-ready stale/fetching visual feedback
 * Shows when TanStack Query data is stale or refetching in background
 *
 * Production Usage:
 * const query = useProperty(id)
 * <div className="flex items-center gap-2">
 *   <h1>Property Details</h1>
 *   <QueryStateIndicator isStale={query.isStale} isFetching={query.isFetching} />
 * </div>
 *
 * All TanStack Query hooks return isStale and isFetching flags by default.
 * No hook modifications needed - use component inline anywhere data staleness matters.
 */
import { RefreshCw } from 'lucide-react'
import { Badge } from './badge'
import { cn } from '@/lib/utils'

interface QueryStateIndicatorProps {
	isStale?: boolean
	isFetching?: boolean
	className?: string
}

export function QueryStateIndicator({
	isStale,
	isFetching,
	className
}: QueryStateIndicatorProps) {
	// Show nothing if data is fresh and not fetching
	if (!isStale && !isFetching) return null

	return (
		<Badge
			variant="outline"
			className={cn(
				'text-muted-foreground',
				isFetching && 'animate-pulse',
				className
			)}
		>
			{isFetching ? (
				<>
					<RefreshCw className="size-3 animate-spin" />
					Updating
				</>
			) : (
				<>
					<RefreshCw className="size-3" />
					Stale
				</>
			)}
		</Badge>
	)
}
