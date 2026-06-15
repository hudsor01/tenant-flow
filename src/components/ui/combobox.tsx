import * as ComboboxPrimitive from "@diceui/combobox";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

const Combobox = (({
	className,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Root>) => {
	return (
		<ComboboxPrimitive.Root
			data-slot="combobox"
			className={cn(className)}
			{...props}
		/>
	);
}) as ComboboxPrimitive.ComboboxRootComponentProps;

function ComboboxAnchor({
	className,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Anchor>) {
	return (
		<ComboboxPrimitive.Anchor
			data-slot="combobox-anchor"
			className={cn(
				"relative flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 shadow-xs data-focused:ring-1 data-focused:ring-ring",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxInput({
	className,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Input>) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-input"
			className={cn(
				"flex h-9 w-full rounded-md bg-transparent text-base placeholder:text-muted-foreground focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxTrigger({
	className,
	children,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Trigger>) {
	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn(
				"flex shrink-0 items-center justify-center rounded-r-md border-input bg-transparent text-muted-foreground transition-colors hover:text-foreground/80 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children || <ChevronDown className="size-4" />}
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxContent({
	sideOffset = 6,
	className,
	children,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Content>) {
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Content
				data-slot="combobox-content"
				sideOffset={sideOffset}
				className={cn(
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-fit min-w-(--dice-anchor-width) origin-(--dice-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
					className,
				)}
				{...props}
			>
				{children}
			</ComboboxPrimitive.Content>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxEmpty({
	className,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Empty>) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn("py-6 text-center text-sm", className)}
			{...props}
		/>
	);
}

function ComboboxItem({
	className,
	children,
	outset,
	...props
}: ComponentProps<typeof ComboboxPrimitive.Item> & {
	outset?: boolean;
}) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
				outset ? "pr-8 pl-2" : "pr-2 pl-8",
				className,
			)}
			{...props}
		>
			<ComboboxPrimitive.ItemIndicator
				className={cn(
					"absolute flex size-3.5 items-center justify-center",
					outset ? "right-2" : "left-2",
				)}
			>
				<Check className="size-4" />
			</ComboboxPrimitive.ItemIndicator>
			<ComboboxPrimitive.ItemText>{children}</ComboboxPrimitive.ItemText>
		</ComboboxPrimitive.Item>
	);
}

export {
	Combobox,
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxTrigger,
};
