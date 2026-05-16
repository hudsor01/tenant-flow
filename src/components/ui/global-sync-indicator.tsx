"use client";

/**
 * GlobalSyncIndicator
 * Shows global mutation sync status in the UI
 *
 * States:
 * - Saved: No pending mutations (Cloud icon)
 * - Syncing: Mutations in progress (Spinner + count)
 */

import { Cloud, Loader2 } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#components/ui/tooltip";
import { usePendingMutations } from "#hooks/api/use-pending-mutations";
import { cn } from "#lib/utils";

interface GlobalSyncIndicatorProps {
	className?: string;
	/** Show in compact mode (icon only when saved) */
	compact?: boolean;
}

export function GlobalSyncIndicator({
	className,
	compact = false,
}: GlobalSyncIndicatorProps) {
	const { isPending, count, operations } = usePendingMutations();

	if (!isPending) {
		// Session 11 P3 #30 + cycle-2 review: rely on `role="status"`
		// live-region announcement for screen readers (the pill is
		// purely informational, not a control — Enter/Space have
		// nothing to do here). Sighted keyboard users discover the
		// tooltip if they happen to hover. We deliberately do NOT add
		// tabIndex={0} — cycle-2 reviewer caught that as introducing
		// an inert tab stop on every authenticated page.
		const savedTooltip = "All changes saved to TenantFlow.";
		if (compact) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								role="status"
								aria-label={savedTooltip}
								className={cn(
									"flex items-center text-muted-foreground",
									className,
								)}
							>
								<Cloud className="h-4 w-4" />
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>{savedTooltip}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							role="status"
							aria-label={savedTooltip}
							className={cn(
								"flex items-center gap-1.5 text-muted-foreground",
								className,
							)}
						>
							<Cloud className="h-4 w-4" />
							<span className="text-xs">Saved</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>{savedTooltip}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	const tooltipContent =
		operations.length > 0 ? operations.join("\n") : "Syncing...";

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn("flex items-center gap-1.5 text-primary", className)}
					>
						<Loader2 className="h-4 w-4 animate-spin" />
						<span className="text-xs">
							Syncing{count > 1 ? ` (${count})` : "..."}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p className="whitespace-pre-line">{tooltipContent}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
