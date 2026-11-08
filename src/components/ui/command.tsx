"use client";

/**
 * shadcn new-york-v4 registry item `command`.
 *
 * Local divergences (recorded in the divergence register):
 * - CommandInput wrapper h-11 (44px row outside CommandDialog) instead of h-9;
 *   inside the dialog the upstream **:data-[slot=command-input-wrapper]:h-12
 *   raises it to 48px;
 * - CommandList max-h-75 instead of the equal max-h-[300px];
 * - class token order in Command, CommandInput, CommandGroup,
 *   CommandSeparator, CommandItem and CommandShortcut;
 * - a selected item's icons take text-accent-foreground through
 *   data-[selected=true]:[&_svg:not([class*='text-'])]:, so they do not stay
 *   muted-foreground on the emerald fill (1.86:1 light, 1.06:1 dark);
 * - the CommandInput wrapper's bottom border, the field's only boundary, is
 *   border-input (3:1, WCAG 1.4.11) and turns border-ring while the input has
 *   focus, where upstream draws the 1.4:1 default border and no focus mark
 *   (66.2-39 fix round 4, Part 5b).
 */
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import type { ComponentProps } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { cn } from "#lib/utils";

function Command({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn(
				"bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
				className,
			)}
			{...props}
		/>
	);
}

function CommandDialog({
	title = "Command Palette",
	description = "Search for a command to run...",
	children,
	className,
	showCloseButton = true,
	...props
}: ComponentProps<typeof Dialog> & {
	title?: string;
	description?: string;
	className?: string;
	showCloseButton?: boolean;
}) {
	return (
		<Dialog {...props}>
			<DialogHeader className="sr-only">
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogContent
				className={cn("overflow-hidden p-0", className)}
				showCloseButton={showCloseButton}
			>
				<Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
}

function CommandInput({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex h-11 items-center gap-2 border-b border-input px-3 focus-within:border-ring"
		>
			<SearchIcon className="size-4 shrink-0 opacity-50" />
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(
				"max-h-75 scroll-py-1 overflow-x-hidden overflow-y-auto",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({
	...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className="py-6 text-center text-sm"
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				"text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn("bg-border -mx-1 h-px", className)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground data-[selected=true]:[&_svg:not([class*='text-'])]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function CommandShortcut({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			data-slot="command-shortcut"
			className={cn(
				"text-muted-foreground ml-auto text-xs tracking-widest",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
};
