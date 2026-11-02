/**
 * shadcn new-york-v4 registry item `badge`.
 *
 * Local divergences (recorded in the divergence register):
 * - size axis (default, sm, lg, trust) carries rounded-md/rounded-full, px,
 *   py, text size, gap and [&>svg]:size-*; the base string has no
 *   rounded-full, px-2, py-0.5, text-xs, gap-1 or [&>svg]:size-3, and each
 *   filled variant adds border-transparent;
 * - local variants success, warning, info and trustIndicator;
 * - destructive text uses text-destructive-foreground instead of the upstream
 *   named-white text utility;
 * - upstream ghost and link variants, outline border-border, the data-variant
 *   attribute and the variant = "default" parameter default are not adopted;
 * - asChild uses Slot.Slot, not upstream Slot.Root;
 * - badgeVariants export removed;
 * - class token order in badgeVariants base and the destructive variant kept
 *   as written locally (upstream re-sorted the same tokens);
 * - the default and destructive anchor hovers fill with bg-primary-text and
 *   bg-destructive-text in light, keeping /90 in dark (as Button); the success
 *   anchor hover is bg-success/12, not /15 (success-text 4.57:1 against
 *   4.44:1).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

const badgeVariants = cva(
	"inline-flex items-center justify-center border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
	{
		variants: {
			variant: {
				// Base variants (shadcn defaults)
				default:
					"border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-text dark:[a&]:hover:bg-primary/90",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive-text dark:[a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
				// Semantic status variants
				success:
					"border-success/20 bg-success/10 text-success-text [a&]:hover:bg-success/12",
				warning:
					"border-warning/20 bg-warning/10 text-warning-text [a&]:hover:bg-warning/15",
				info: "border-info/20 bg-info/10 text-info-text [a&]:hover:bg-info/15",
				// Trust indicator variant
				trustIndicator:
					"rounded-full border-primary/20 bg-primary/5 text-primary-text backdrop-blur-sm",
			},
			size: {
				default: "rounded-md px-2 py-0.5 text-xs [&>svg]:size-3 gap-1",
				sm: "rounded-md px-1.5 py-0.5 text-[10px] [&>svg]:size-2.5 gap-0.5",
				lg: "rounded-md px-3 py-1 text-sm [&>svg]:size-4 gap-1",
				// Trust indicator size
				trust: "rounded-full px-4 py-2 text-sm gap-2 [&>svg]:size-4",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Badge({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Slot : "span";

	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { Badge };
