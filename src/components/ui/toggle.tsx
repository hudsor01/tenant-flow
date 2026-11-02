"use client";

/**
 * shadcn new-york-v4 registry item `toggle`.
 *
 * Local divergences (recorded in the divergence register):
 * - Toggle component removed; only toggleVariants is exported (no toggle
 *   data-slot);
 * - toggleVariants base uses inline-flex-center and typography-small,
 *   transition-all duration-200, and a primary on-state (bg-primary,
 *   text-primary-foreground, shadow-md, font-semibold, hover:bg-primary/90) in
 *   place of the upstream accent on-state; the outline variant hovers bg-muted
 *   and adds data-[state=on]:border-primary;
 * - 44px targets: sizes default h-11 min-w-11, sm h-11 min-w-11, lg h-12
 *   min-w-12;
 * - the on-state hover fills with bg-primary-text in light (primary-foreground
 *   6.84:1), keeping primary/90 in dark, instead of primary/90 in both (4.16:1
 *   light).
 */
import { cva } from "class-variance-authority";

const toggleVariants = cva(
	"inline-flex-center gap-2 rounded-md typography-small transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md data-[state=on]:font-semibold data-[state=on]:hover:bg-primary-text dark:data-[state=on]:hover:bg-primary/90",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline:
					"border border-input bg-transparent shadow-xs hover:bg-muted hover:text-muted-foreground data-[state=on]:border-primary",
			},
			size: {
				default: "h-11 px-2 min-w-11",
				sm: "h-11 px-1.5 min-w-11",
				lg: "h-12 px-2.5 min-w-12",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export { toggleVariants };
