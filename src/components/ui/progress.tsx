"use client";

/**
 * shadcn new-york-v4 registry item `progress`, fetched 2026-10-31
 * (registry JSON sha256 prefix ca0c7ae4d88b8039).
 *
 * Local divergences (recorded in the divergence register):
 * - variant and size cva maps for the track and the indicator;
 * - the status indicators fill with the AA companion tokens (`success-text`,
 *   `warning-text`, `destructive-text`), not the vivid fills: a meter fill is
 *   a graphical object (WCAG 1.4.11, 3:1), and the vivid success and warning
 *   fills read 2.62:1 and 2.18:1 on the light card, 2.15:1 and 1.87:1 on their
 *   own track, and the dark destructive fill 2.97:1 on its track. The default
 *   indicator keeps upstream's `bg-primary` (5.02:1 on the card, 3.76:1 on its
 *   track, light). There is no `secondary` variant: no caller used it, and its
 *   fill read 1.11:1 on the card;
 * - `value` is forwarded to the Radix root explicitly, so the progressbar
 *   exposes its value, value text and state to assistive technology.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

const progressVariants = cva("relative w-full overflow-hidden rounded-full", {
	variants: {
		variant: {
			default: "bg-primary/20",
			success: "bg-success/20",
			warning: "bg-warning/20",
			destructive: "bg-destructive/20",
		},
		size: {
			default: "h-2",
			sm: "h-1",
			lg: "h-3",
			xl: "h-4",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

const progressIndicatorVariants = cva("h-full w-full flex-1 transition-all", {
	variants: {
		variant: {
			default: "bg-primary",
			success: "bg-success-text",
			warning: "bg-warning-text",
			destructive: "bg-destructive-text",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

function Progress({
	className,
	value,
	variant,
	size,
	...props
}: ComponentProps<typeof ProgressPrimitive.Root> &
	VariantProps<typeof progressVariants>) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			className={cn(progressVariants({ variant, size }), className)}
			value={value}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className={progressIndicatorVariants({ variant })}
				style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
