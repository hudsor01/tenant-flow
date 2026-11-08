"use client";

/**
 * Local divergences from the shadcn registry item, fix round 4, Part 5b
 * (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1;
 * - TabsContent, a tab stop, draws that ring on keyboard focus: upstream's
 *   outline-none panel showed only the base 4px ring/20 halo (1.32:1).
 */
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Tabs({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function TabsList({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"bg-muted text-muted-foreground inline-flex h-11 w-fit items-center justify-center rounded-lg p-[3px]",
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 typography-small whitespace-nowrap transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				// Inactive state - muted colors
				"text-muted-foreground hover:text-foreground hover:bg-muted/50",
				// Active state - primary blue matching sidebar
				"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold",
				// Focus styles
				"focus-visible:border-ring focus-visible:ring-ring focus-visible:outline-ring",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn(
				"flex-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
				className,
			)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
