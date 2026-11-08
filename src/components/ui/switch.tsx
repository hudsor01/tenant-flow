"use client";

/**
 * Local divergence from the shadcn registry item, fix round 4, Part 5b
 * (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1;
 * - the unchecked track is bg-input in dark too, where upstream fades it to
 *   bg-input/80: the faded track read 2.61-2.65:1 against the page.
 */
import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Switch({
	className,
	...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
