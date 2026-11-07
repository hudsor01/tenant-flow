import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

/**
 * Tracks the shadcn new-york-v4 `button` registry item (D-29): data-slot,
 * data-variant and data-size, shrink-0, the svg auto-size rule, the 3px focus
 * ring, the aria-invalid ring, the outline shadow-xs and dark surfaces, and
 * asChild through Slot.Root.
 *
 * Kept local customizations (D-26):
 * - typography-small instead of text-sm font-medium;
 * - the 44px touch floor (min-h-11 on every size, min-w-11 on icon) with the
 *   h-10 / h-9 / h-11 heights;
 * - no has-[>svg] padding reductions and no xs, icon-xs, icon-sm or icon-lg
 *   sizes;
 * - text-destructive-foreground on destructive instead of a named white;
 * - link text-primary-text, the AA text companion;
 * - the default and destructive light hovers fill with bg-primary-text and
 *   bg-destructive-text (6.84:1 and 6.38:1), where upstream's /90 tints read
 *   4.16:1 and 4.39:1; dark keeps the /90 hovers;
 * - outline and ghost add dark:hover:text-foreground: this theme's dark
 *   accent-foreground is near-black, so upstream's dark hover label read
 *   1.17:1 on input/50 and 2.63:1 on accent/50 (the CP-2 fills stay).
 *
 * An svg inside a Button renders 16px unless it carries a size- class, so
 * callers size icons with size-N, never h-N w-N. The outline and dark surfaces
 * are the v4 ones: the owner kept them at CP-2 (66.2-38, "Keep v4").
 */
const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-md typography-small whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary-text dark:hover:bg-primary/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive-text dark:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
				outline:
					"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:hover:text-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 dark:hover:text-foreground",
				link: "text-primary-text underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2 min-h-11",
				sm: "h-9 rounded-md px-3 min-h-11",
				lg: "h-11 rounded-md px-8 min-h-11",
				icon: "size-10 min-h-11 min-w-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
