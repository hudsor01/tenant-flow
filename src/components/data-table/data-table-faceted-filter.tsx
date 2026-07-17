"use client";

"use no memo";

import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle, XCircle } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";

import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "#components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import { Separator } from "#components/ui/separator";
import { cn } from "#lib/utils";
import type { Option } from "#types/data-table";

interface DataTableFacetedFilterProps<TData, TValue> {
	column?: Column<TData, TValue>;
	title?: string;
	options: Option[];
	multiple?: boolean;
}

export function DataTableFacetedFilter<TData, TValue>({
	column,
	title,
	options,
	multiple,
}: DataTableFacetedFilterProps<TData, TValue>) {
	const [open, setOpen] = useState(false);

	const columnFilterValue = column?.getFilterValue();
	const selectedValues = new Set(
		Array.isArray(columnFilterValue) ? columnFilterValue : [],
	);

	const onItemSelect = (option: Option, isSelected: boolean) => {
		if (!column) return;

		if (multiple) {
			const newSelectedValues = new Set(selectedValues);
			if (isSelected) {
				newSelectedValues.delete(option.value);
			} else {
				newSelectedValues.add(option.value);
			}
			const filterValues = Array.from(newSelectedValues);
			column.setFilterValue(filterValues.length ? filterValues : undefined);
		} else {
			column.setFilterValue(isSelected ? undefined : [option.value]);
			setOpen(false);
		}
	};

	const onReset = (event?: MouseEvent) => {
		event?.stopPropagation();
		column?.setFilterValue(undefined);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="relative inline-flex items-center">
				{selectedValues.size > 0 && (
					<button
						type="button"
						aria-label={`Clear ${title} filter`}
						onClick={onReset}
						className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						<XCircle className="size-4" />
					</button>
				)}
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className={cn(
							"border-dashed font-normal",
							selectedValues.size > 0 && "pl-8",
						)}
					>
						{selectedValues.size === 0 && <PlusCircle />}
						{title}
						{selectedValues?.size > 0 && (
							<>
								<Separator
									orientation="vertical"
									className="mx-0.5 data-[orientation=vertical]:h-4"
								/>
								<Badge
									variant="secondary"
									className="rounded-sm px-1 font-normal lg:hidden"
								>
									{selectedValues.size}
								</Badge>
								<div className="hidden items-center gap-1 lg:flex">
									{selectedValues.size > 2 ? (
										<Badge
											variant="secondary"
											className="rounded-sm px-1 font-normal"
										>
											{selectedValues.size} selected
										</Badge>
									) : (
										options
											.filter((option) => selectedValues.has(option.value))
											.map((option) => (
												<Badge
													variant="secondary"
													key={option.value}
													className="rounded-sm px-1 font-normal"
												>
													{option.label}
												</Badge>
											))
									)}
								</div>
							</>
						)}
					</Button>
				</PopoverTrigger>
			</div>
			<PopoverContent className="w-50 p-0" align="start">
				<Command>
					<CommandInput placeholder={title} />
					<CommandList className="max-h-full">
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
							{options.map((option) => {
								const isSelected = selectedValues.has(option.value);

								return (
									<CommandItem
										key={option.value}
										onSelect={() => onItemSelect(option, isSelected)}
									>
										<div
											className={cn(
												"flex size-4 items-center justify-center rounded-sm border border-primary",
												isSelected
													? "bg-primary"
													: "opacity-50 [&_svg]:invisible",
											)}
										>
											<Check />
										</div>
										{option.icon && <option.icon />}
										<span className="truncate">{option.label}</span>
										{option.count && (
											<span className="ml-auto font-mono text-xs">
												{option.count}
											</span>
										)}
									</CommandItem>
								);
							})}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => onReset()}
										className="justify-center text-center"
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
