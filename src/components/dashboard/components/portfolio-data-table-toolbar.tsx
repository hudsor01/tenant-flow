"use client";

import type { Table } from "@tanstack/react-table";
import { LayoutGrid, List, Search, X } from "lucide-react";

import { DataTableFacetedFilter } from "#components/data-table/data-table-faceted-filter";
import { DataTableViewOptions } from "#components/data-table/data-table-view-options";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import type { Option } from "#types/data-table";

type ViewMode = "table" | "grid";

interface PortfolioDataTableToolbarProps<TData> {
	table: Table<TData>;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	/**
	 * Status faceted-filter options (DT-04). Defaults to the `status` column's
	 * `meta.options` (active/expiring/vacant) when not supplied by the caller.
	 */
	statusOptions?: Option[];
}

/**
 * Portfolio DataTable toolbar (DT-04 / DT-05 / DT-07 + W-3 search).
 *
 * Composition:
 * - Search Input -> filters the PINNED Property column on the "property" nuqs
 *   key. The Property column's name||address `filterFn` (Plan 05-01b) matches
 *   NAME or ADDRESS, so an address-only row survives the search (W-3). There is
 *   NO separate `search`/`q` key — search IS the Property column filter.
 * - `DataTableFacetedFilter` for the multi-select status filter (DT-04).
 * - `DataTableViewOptions` for column visibility (DT-05) — reads `meta.label`.
 * - A `role="radiogroup"` grid/table segmented toggle (DT-07) lifted from the
 *   hand-rolled `portfolio-toolbar.tsx`, preserving `aria-checked` semantics.
 * - A Reset control surfaced whenever any column filter is active.
 */
export function PortfolioDataTableToolbar<TData>({
	table,
	viewMode,
	onViewModeChange,
	statusOptions,
}: PortfolioDataTableToolbarProps<TData>) {
	const propertyColumn = table.getColumn("property");
	const statusColumn = table.getColumn("status");
	const searchValue = (propertyColumn?.getFilterValue() as string) ?? "";
	const isFiltered = table.getState().columnFilters.length > 0;
	const resolvedStatusOptions =
		statusOptions ?? statusColumn?.columnDef.meta?.options ?? [];

	return (
		<div className="flex w-full flex-wrap items-center gap-3 border-border border-b bg-muted/30 px-4 py-3">
			<div className="relative w-64">
				<Search
					aria-hidden="true"
					className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
				/>
				<Input
					inputSize="sm"
					placeholder="Search properties..."
					value={searchValue}
					onChange={(event) =>
						propertyColumn?.setFilterValue(event.target.value)
					}
					className="pl-9"
				/>
			</div>

			{statusColumn && (
				<DataTableFacetedFilter
					column={statusColumn}
					title="Status"
					options={resolvedStatusOptions}
					multiple
				/>
			)}

			{isFiltered && (
				<Button
					aria-label="Reset filters"
					variant="outline"
					size="sm"
					className="border-dashed font-normal"
					onClick={() => table.resetColumnFilters()}
				>
					<X />
					Reset
				</Button>
			)}

			<div className="ml-auto flex items-center gap-3">
				<DataTableViewOptions table={table} align="end" />

				<div
					className="flex items-center gap-1 rounded-lg bg-muted p-1"
					role="radiogroup"
					aria-label="View mode"
				>
					<button
						type="button"
						role="radio"
						onClick={() => onViewModeChange("grid")}
						aria-checked={viewMode === "grid"}
						className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
							viewMode === "grid"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<LayoutGrid aria-hidden="true" className="size-4" />
						Grid
					</button>
					<button
						type="button"
						role="radio"
						onClick={() => onViewModeChange("table")}
						aria-checked={viewMode === "table"}
						className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
							viewMode === "table"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<List aria-hidden="true" className="size-4" />
						Table
					</button>
				</div>
			</div>
		</div>
	);
}
