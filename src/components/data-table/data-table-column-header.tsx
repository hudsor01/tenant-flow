"use client";

import type { Column } from "@tanstack/react-table";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	EyeOff,
	X,
} from "lucide-react";
import type { ComponentProps, KeyboardEvent } from "react";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { cn } from "#lib/utils";

/**
 * Derive the WAI-ARIA sort token from a column's sort state.
 *
 * B-1: the sort attribute is only valid on the element carrying
 * `role="columnheader"` (the `<th>` / `<TableHead>`). The vendored header
 * renders a `<button>` that `data-table.tsx` `flexRender`s INSIDE the `<th>`,
 * so the button can never be the columnheader and must NOT carry the sort
 * attribute. Plan 05-02 consumes this helper at the `<th>`, passing the result
 * to the `<TableHead>` sort prop so the token lands on the columnheader.
 */
export function getAriaSort<TData, TValue>(
	column: Column<TData, TValue>,
): "none" | "ascending" | "descending" {
	const sorted = column.getIsSorted();
	if (sorted === "asc") return "ascending";
	if (sorted === "desc") return "descending";
	return "none";
}

interface DataTableColumnHeaderProps<TData, TValue>
	extends ComponentProps<typeof DropdownMenuTrigger> {
	column: Column<TData, TValue>;
	label: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	label,
	className,
	...props
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort() && !column.getCanHide()) {
		return <div className={cn(className)}>{label}</div>;
	}

	// Keyboard-operable fast sort (DT-03): Enter/Space on the focused trigger
	// toggles sort direction directly so keyboard users sort without opening the
	// dropdown. Mouse users still get the asc/desc/reset/hide dropdown verbatim.
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (!column.getCanSort()) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			column.toggleSorting(column.getIsSorted() === "asc");
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				onKeyDown={handleKeyDown}
				className={cn(
					"-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
					column.getIsSorted() && "[&_svg]:text-primary",
					className,
				)}
				{...props}
			>
				{label}
				{column.getCanSort() &&
					(column.getIsSorted() === "desc" ? (
						<ChevronDown />
					) : column.getIsSorted() === "asc" ? (
						<ChevronUp />
					) : (
						<ChevronsUpDown />
					))}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-28">
				{column.getCanSort() && (
					<>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "asc"}
							onClick={() => column.toggleSorting(false)}
						>
							<ChevronUp />
							Asc
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
							checked={column.getIsSorted() === "desc"}
							onClick={() => column.toggleSorting(true)}
						>
							<ChevronDown />
							Desc
						</DropdownMenuCheckboxItem>
						{column.getIsSorted() && (
							<DropdownMenuItem
								className="pl-2 [&_svg]:text-muted-foreground"
								onClick={() => column.clearSorting()}
							>
								<X />
								Reset
							</DropdownMenuItem>
						)}
					</>
				)}
				{column.getCanHide() && (
					<DropdownMenuCheckboxItem
						className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
						checked={!column.getIsVisible()}
						onClick={() => column.toggleVisibility(false)}
					>
						<EyeOff />
						Hide
					</DropdownMenuCheckboxItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
