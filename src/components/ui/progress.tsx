"use client";

/**
 * shadcn new-york-v4 registry item `progress`, fetched 2026-10-31
 * (registry JSON sha256 prefix ca0c7ae4d88b8039).
 *
 * Local divergences (recorded in the divergence register):
 * - variant and size cva maps for the track and the indicator;
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
			secondary: "bg-secondary/20",
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
			secondary: "bg-secondary",
			success: "bg-success",
			warning: "bg-warning",
			destructive: "bg-destructive",
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
