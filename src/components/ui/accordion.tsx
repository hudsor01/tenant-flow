"use client";

/**
 * Local divergence from the shadcn registry item, fix round 4, Part 5b
 * (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1.
 * - `forceMount` on AccordionContent keeps a closed panel in the HTML and
 *   hides it with `data-[state=closed]:hidden`: Radix renders a force-mounted
 *   panel open, so without the class a closed answer would show (2026-11-24
 *   SEO audit P1, FAQ answers the FAQPage schema carries).
 */
import { ChevronDownIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Accordion({
	...props
}: ComponentProps<typeof AccordionPrimitive.Root>) {
	return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
	className,
	...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn("border-b last:border-b-0", className)}
			{...props}
		/>
	);
}

function AccordionTrigger({
	className,
	children,
	...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					"focus-visible:border-ring focus-visible:ring-ring flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left typography-small transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
					className,
				)}
				{...props}
			>
				{children}
				<ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

function AccordionContent({
	className,
	children,
	...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			data-slot="accordion-content"
			className={cn(
				"data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm",
				props.forceMount && "data-[state=closed]:hidden",
			)}
			{...props}
		>
			<div className={cn("pt-0 pb-4", className)}>{children}</div>
		</AccordionPrimitive.Content>
	);
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
