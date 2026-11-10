/**
 * Local divergence from the shadcn registry item, fix round 4, Part 5b
 * (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1;
 * - invalid focus ring `ring-destructive-text` where upstream draws
 *   `ring-destructive/20` (dark `/40`), which read 1.43:1.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

const inputVariants = cva(
	"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px] aria-invalid:ring-destructive-text aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "",
				invalid: "border-destructive focus-visible:ring-destructive",
			},
			inputSize: {
				default: "h-11",
				sm: "h-9 px-2 py-1 text-xs",
				lg: "h-12 px-4 py-2",
				xl: "h-14 px-4 py-3 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			inputSize: "default",
		},
	},
);

function Input({
	className,
	type,
	variant,
	inputSize,
	...props
}: ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(inputVariants({ variant, inputSize }), className)}
			{...props}
		/>
	);
}

export { Input };
