"use client";

/**
 * shadcn new-york-v4 registry item `popover`.
 *
 * Local divergences (recorded in the divergence register):
 * - PopoverAnchor is removed (Phase 19 trim), and upstream's PopoverHeader,
 *   PopoverTitle and PopoverDescription are not adopted (no consumer);
 * - PopoverContent is bounded by the space Radix measures around it
 *   (`--radix-popover-content-available-height` and `-width`) and its
 *   content scrolls, where upstream sets no bound: the document vault's
 *   date-range calendar opened 777.5px tall in 444px above its trigger at
 *   390x844, its month navigation and first weeks above the viewport, and
 *   its category filter ran 1251px tall at 1280x800, 23 of its 37 options
 *   below the viewport (66.2-39 fix round 4, Part 5d).
 */
import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Popover({ ...props }: ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
	...props
}: ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
	className,
	align = "center",
	sideOffset = 4,
	...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				data-slot="popover-content"
				align={align}
				sideOffset={sideOffset}
				className={cn(
					"bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-popover-content-available-height) w-72 max-w-(--radix-popover-content-available-width) origin-(--radix-popover-content-transform-origin) overflow-y-auto rounded-md border p-4 shadow-md outline-hidden",
					className,
				)}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
