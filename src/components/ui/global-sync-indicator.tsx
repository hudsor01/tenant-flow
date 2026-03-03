'use client'

/**
 * GlobalSyncIndicator
 * Shows global mutation sync status in the UI
 *
 * States:
 * - Saved: No pending mutations (Cloud icon)
 * - Syncing: Mutations in progress (Spinner + count)
 */

import { usePendingMutations } from '#hooks/api/use-pending-mutations'
import { Cloud, Loader2 } from 'lucide-react'
import { cn } from '#lib/utils'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '#components/ui/tooltip'

interface GlobalSyncIndicatorProps {
	className?: string
	/** Show in compact mode (icon only when saved) */
	compact?: boolean
}

export function GlobalSyncIndicator({
	className,
	compact = false
}: GlobalSyncIndicatorProps) {
	const { isPending, count, operations } = usePendingMutations()

	if (!isPending) {
		if (compact) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								className={cn(
									'flex items-center text-muted-foreground',
									className
								)}
							>
								<Cloud className="h-4 w-4" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>All changes saved</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)
		}

		return (
			<div
				className={cn(
					'flex items-center gap-1.5 text-muted-foreground',
					className
				)}
			>
				<Cloud className="h-4 w-4" />
				<span className="text-xs">Saved</span>
			</div>
		)
	}

	const tooltipContent = operations.length > 0 ? operations.join('\n') : 'Syncing...'

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn('flex items-center gap-1.5 text-primary', className)}
					>
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-xs">
							Syncing{count > 1 ? ` (${count})` : '...'}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p className="whitespace-pre-line">{tooltipContent}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
