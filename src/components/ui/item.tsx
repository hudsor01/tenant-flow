"use client";

/**
 * shadcn new-york-v4 registry item `item`.
 *
 * Local divergences (recorded in the divergence register):
 * - ItemHeader and ItemFooter removed (item-header, item-footer data-slots);
 * - Item asChild renders Slot.Slot where upstream renders Slot.Root;
 * - ItemDescription link hover uses text-primary-text in place of
 *   text-primary;
 * - class token order in itemVariants (the default size string keeps a
 *   trailing space), itemMediaVariants and ItemDescription;
 * - the anchor hover fill is accent/25, not upstream's accent/50:
 *   muted-foreground descriptions read 3.43:1 (light) and 3.07:1 (dark) on the
 *   emerald accent/50.
 *
 * Fix round 4, Part 5b (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1.
 *
 * Fix round 4, Part 8h (66.2-39; recorded in the divergence register):
 * - an Item inside an ItemGroup is a `listitem`: the group is a `list`, and
 *   with no listitem children axe's `aria-required-children` failed /about's
 *   and /help's groups (WCAG 1.3.1). The group tells its items through a
 *   context, so an Item outside a group keeps no role.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { type ComponentProps, createContext, useContext } from "react";
import { Separator } from "#components/ui/separator";
import { cn } from "#lib/utils";

/** Whether an Item renders inside an ItemGroup, whose list it is an item of. */
const ItemGroupContext = createContext(false);

function ItemGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<ItemGroupContext value>
			<div
				role="list"
				data-slot="item-group"
				className={cn("group/item-group flex flex-col", className)}
				{...props}
			/>
		</ItemGroupContext>
	);
}

function ItemSeparator({
	className,
	...props
}: ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="item-separator"
			orientation="horizontal"
			className={cn("my-0", className)}
			{...props}
		/>
	);
}

const itemVariants = cva(
	"group/item flex items-center border border-transparent text-sm rounded-md transition-colors [a]:hover:bg-accent/25 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-[3px]",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border-border",
				muted: "bg-muted/50",
			},
			size: {
				default: "p-4 gap-4 ",
				sm: "py-3 px-4 gap-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Item({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: ComponentProps<"div"> &
	VariantProps<typeof itemVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Slot : "div";
	const inGroup = useContext(ItemGroupContext);
	return (
		<Comp
			role={inGroup ? "listitem" : undefined}
			data-slot="item"
			data-variant={variant}
			data-size={size}
			className={cn(itemVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

const itemMediaVariants = cva(
	"flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none group-has-[[data-slot=item-description]]/item:translate-y-0.5",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "size-8 border rounded-sm bg-muted [&_svg:not([class*='size-'])]:size-4",
				image:
					"size-10 rounded-sm overflow-hidden [&_img]:size-full [&_img]:object-cover",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function ItemMedia({
	className,
	variant = "default",
	...props
}: ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
	return (
		<div
			data-slot="item-media"
			data-variant={variant}
			className={cn(itemMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function ItemContent({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="item-content"
			className={cn(
				"flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none",
				className,
			)}
			{...props}
		/>
	);
}

function ItemTitle({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="item-title"
			className={cn(
				"flex w-fit items-center gap-2 text-sm leading-snug font-medium",
				className,
			)}
			{...props}
		/>
	);
}

function ItemDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			data-slot="item-description"
			className={cn(
				"text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance",
				"[&>a:hover]:text-primary-text [&>a]:underline [&>a]:underline-offset-4",
				className,
			)}
			{...props}
		/>
	);
}

function ItemActions({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="item-actions"
			className={cn("flex items-center gap-2", className)}
			{...props}
		/>
	);
}

export {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
};
