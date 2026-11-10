"use client";

/**
 * GlobalSyncIndicator
 * Shows global mutation sync status in the UI
 *
 * States:
 * - Saved: No pending mutations (Cloud icon)
 * - Syncing: Mutations in progress (Spinner + count)
 *
 * Both states render ONE structure, so React updates it in place:
 * - The tooltip trigger is a `button`, the canonical Radix Tooltip trigger, so
 *   keyboard users reach the tooltip by focus as pointer users do by hover
 *   (WCAG 1.4.13, 2.1.1). Its name is its visible text ("Saved", "Syncing...",
 *   "Syncing (2)"), held in a plain `span`; in compact mode (or below sm with
 *   `compactBelowSm`) the saved text is sr-only and still names it.
 *   It has no action of its own. Enter and Space still dismiss the tooltip
 *   focus opened: on a native button either key fires a click, and Radix's
 *   TooltipTrigger closes the tooltip on click. The next focus or hover opens
 *   it again.
 * - The same text is mirrored into a visually hidden `role="status"` live
 *   region beside the trigger, which stays mounted across the state switch,
 *   so "Syncing..." and the return to "Saved" are announced. It cannot sit in
 *   the button: `status` takes no name from its content, so the button's name
 *   was empty in Chrome, and a button's children are presentational, so a
 *   region inside it may not be exposed (66.2-39 fix round 3, F77).
 * - The tooltip text is a `span`: a `p` would take the 16px `@layer base`
 *   paragraph margin and leave a blank band at the foot of the tooltip.
 */

import { Cloud, Loader2 } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#components/ui/tooltip";
import { usePendingMutations } from "#hooks/api/use-pending-mutations";
import { cn } from "#lib/utils";

interface GlobalSyncIndicatorProps {
	className?: string;
	/** Show in compact mode (icon only when saved) */
	compact?: boolean;
	/**
	 * Compact below the sm breakpoint only (the app header at phone widths):
	 * the saved state shows its icon there, its text kept for screen readers.
	 */
	compactBelowSm?: boolean;
}

const SAVED_TOOLTIP = "All changes saved to TenantFlow.";

export function GlobalSyncIndicator({
	className,
	compact = false,
	compactBelowSm = false,
}: GlobalSyncIndicatorProps) {
	const { isPending, count, operations } = usePendingMutations();

	const statusText = isPending
		? `Syncing${count > 1 ? ` (${count})` : "..."}`
		: "Saved";
	const tooltipText = isPending
		? operations.length > 0
			? operations.join("\n")
			: "Syncing..."
		: SAVED_TOOLTIP;
	const Icon = isPending ? Loader2 : Cloud;

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex items-center gap-1.5 rounded-sm",
							isPending ? "text-primary-text" : "text-muted-foreground",
							className,
						)}
					>
						<Icon
							className={cn("size-4", isPending && "animate-spin")}
							aria-hidden="true"
						/>
						<span
							className={
								isPending
									? "text-xs"
									: compact
										? "sr-only"
										: compactBelowSm
											? "text-xs max-sm:sr-only"
											: "text-xs"
							}
						>
							{statusText}
						</span>
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<span className="whitespace-pre-line">{tooltipText}</span>
				</TooltipContent>
			</Tooltip>
			<span role="status" className="sr-only">
				{statusText}
			</span>
		</>
	);
}
