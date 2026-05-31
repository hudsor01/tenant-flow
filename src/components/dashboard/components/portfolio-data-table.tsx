"use client";

import {
	flexRender,
	type OnChangeFn,
	type Table as TanstackTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Building2, Search } from "lucide-react";
import { useRef } from "react";
import { portfolioColumns } from "#components/dashboard/components/portfolio-columns";
import { PortfolioDataTableToolbar } from "#components/dashboard/components/portfolio-data-table-toolbar";
import { PortfolioGrid } from "#components/dashboard/components/portfolio-grid";
import type { PortfolioRow } from "#components/dashboard/dashboard-types";
import { getAriaSort } from "#components/data-table/data-table-column-header";
import { DataTablePagination } from "#components/data-table/data-table-pagination";
import { BlurFade } from "#components/ui/blur-fade";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#components/ui/table";
import { useClientDataTable } from "#hooks/use-client-data-table";
import { useMediaQuery } from "#hooks/use-media-query";

type ViewMode = "table" | "grid";

// UI-SPEC: rows are a name + address (2 lines); measured min band is h-12 (48px).
// Portfolio rows render ~56px (two text lines + py-2.5), so estimate to 56 while
// never dropping below the 48px touch-target floor.
const ESTIMATED_ROW_HEIGHT = 56;
// ≤375px forces the grid (card) view per the UI-SPEC mobile rule (W-4 / D-5).
const MOBILE_QUERY = "(max-width: 375px)";

interface PortfolioDataTableProps {
	data: PortfolioRow[];
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	/** Controlled column visibility (B-2) — owned by Plan 05-03's presets store. */
	columnVisibility: VisibilityState;
	onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}

/**
 * Assembled portfolio DataTable (DT-01/04/05/06/07).
 *
 * Controlled component: `viewMode`, `columnVisibility`, and the change handlers
 * are owned by Plan 05-03's stores. It does NOT import `dashboard-store` or
 * `dashboard-presets-store`.
 *
 * - aria-sort lands on the actual `<th role="columnheader">` via `getAriaSort`
 *   (B-1); the header BUTTON never carries aria-sort.
 * - Column visibility is passed straight to `useClientDataTable` as controlled
 *   props (B-2) — no edit to the Wave-1 hook.
 * - The tbody is ALWAYS virtualized over the post-pagination page rows (D-2):
 *   one code path, no threshold branch.
 * - The grid view (toggle OR mobile-forced) reads the SAME
 *   `table.getRowModel().rows` (D-5), so the same filter/sort/page applies.
 */
export function PortfolioDataTable({
	data,
	viewMode,
	onViewModeChange,
	columnVisibility,
	onColumnVisibilityChange,
}: PortfolioDataTableProps) {
	const { table } = useClientDataTable({
		data,
		columns: portfolioColumns,
		getRowId: (row) => row.id,
		columnVisibility,
		onColumnVisibilityChange,
		// Restore the prior dashboard's default: property ascending on first paint
		// (the nuqs `sort` default, overridable by URL/preset). Without it the table
		// loaded UNSORTED, diverging from prior behavior.
		initialState: { sorting: [{ id: "property", desc: false }] },
		// The portfolio table has no selection column, so suppress the misleading
		// "0 of N row(s) selected" footer summary (see showSelectedCount below).
		enableRowSelection: false,
	});

	// W-4: at ≤375px force grid regardless of the toggle; the table path is never
	// rendered at that width (no horizontal scroll). The toggle still reflects and
	// sets `viewMode`; only the render mode is overridden here.
	const forceGridMobile = useMediaQuery(MOBILE_QUERY);
	const effectiveView: ViewMode = forceGridMobile ? "grid" : viewMode;

	const pageRows = table.getRowModel().rows;
	const isEmpty = pageRows.length === 0;
	// Distinguish a true no-portfolio state (owner has ZERO properties) from a
	// no-match state (properties exist but the active filter set is empty). Only
	// the latter offers "Clear filters".
	const hasNoProperties = data.length === 0;

	return (
		<BlurFade delay={0.4} inView>
			<div className="overflow-hidden rounded-md border border-border bg-card">
				<PortfolioDataTableToolbar
					table={table}
					viewMode={viewMode}
					onViewModeChange={onViewModeChange}
				/>

				{isEmpty ? (
					hasNoProperties ? (
						<PortfolioNoPropertiesState />
					) : (
						<PortfolioNoMatchState onClear={() => table.resetColumnFilters()} />
					)
				) : effectiveView === "grid" ? (
					<PortfolioGrid data={pageRows.map((row) => row.original)} />
				) : (
					<PortfolioVirtualizedTable table={table} />
				)}

				<div className="border-border border-t px-4 py-3">
					<DataTablePagination table={table} showSelectedCount={false} />
				</div>
			</div>
		</BlurFade>
	);
}

/**
 * No-match state: properties exist but the active filter set is empty. Offers a
 * Clear-filters affordance (mirrors the prior dashboard's filtered-empty block).
 */
function PortfolioNoMatchState({ onClear }: { onClear: () => void }) {
	return (
		<div className="py-12 text-center">
			<Search
				aria-hidden="true"
				className="mx-auto mb-3 size-10 text-muted-foreground/40"
			/>
			<p className="text-muted-foreground">No properties match your filters</p>
			<button
				type="button"
				onClick={onClear}
				className="mt-3 text-primary text-sm hover:underline"
			>
				Clear filters
			</button>
		</div>
	);
}

/**
 * True no-portfolio state: the owner has ZERO properties, so there is nothing to
 * filter. No "Clear filters" affordance — it would be a no-op and misleading.
 */
function PortfolioNoPropertiesState() {
	return (
		<div className="py-12 text-center">
			<Building2
				aria-hidden="true"
				className="mx-auto mb-3 size-10 text-muted-foreground/40"
			/>
			<p className="text-muted-foreground">No properties yet</p>
		</div>
	);
}

/**
 * Sticky-thead + always-on virtualized tbody (D-2), built to the TanStack
 * canonical virtualized-`<table>` pattern: the `<table>` is `display:grid`, each
 * row is a `display:flex`, and EXPLICIT `column.getSize()` widths on both the
 * header `<th>` and the body `<td>` are the single alignment source of truth.
 * `aria-sort` is set on each `<TableHead>` (`<th role="columnheader">`) via
 * `getAriaSort` (B-1). Because grid/flex strip the implicit table ARIA roles,
 * explicit `role` attributes are restored on every structural element. All inline
 * styles here are the sanctioned react-virtual width/transform/grid-flex set.
 */
function PortfolioVirtualizedTable({
	table,
}: {
	table: TanstackTable<PortfolioRow>;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const pageRows = table.getRowModel().rows;

	const rowVirtualizer = useVirtualizer({
		count: pageRows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		overscan: 8,
		// Measure the real rendered height so the two-line Property rows (name +
		// address) are tracked exactly instead of clipped at the 56px estimate
		// (closes the row-overlap P3). Skip Firefox -- getBoundingClientRect
		// measures table border height incorrectly there, so omit the key and
		// fall back to the ResizeObserver default (per the TanStack
		// virtualized-rows example).
		...(typeof window !== "undefined" &&
		navigator.userAgent.indexOf("Firefox") === -1
			? { measureElement: (el: Element) => el.getBoundingClientRect().height }
			: {}),
	});

	return (
		<div ref={scrollRef} className="overflow-auto max-h-[calc(100vh-420px)]">
			<Table role="table" style={{ display: "grid" }}>
				<TableHeader
					role="rowgroup"
					className="bg-muted/30"
					style={{
						display: "grid",
						position: "sticky",
						top: 0,
						zIndex: 1,
					}}
				>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							style={{ display: "flex", width: "100%" }}
						>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									colSpan={header.colSpan}
									role="columnheader"
									aria-sort={getAriaSort(header.column)}
									style={{ display: "flex", width: header.getSize() }}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody
					role="rowgroup"
					style={{
						display: "grid",
						height: `${rowVirtualizer.getTotalSize()}px`,
						position: "relative",
					}}
				>
					{rowVirtualizer.getVirtualItems().map((virtualRow) => {
						const row = pageRows[virtualRow.index];
						if (!row) return null;
						return (
							<TableRow
								key={row.id}
								data-index={virtualRow.index}
								ref={rowVirtualizer.measureElement}
								role="row"
								className="group"
								style={{
									display: "flex",
									position: "absolute",
									transform: `translateY(${virtualRow.start}px)`,
									width: "100%",
								}}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										role="cell"
										className="py-2.5"
										style={{
											display: "flex",
											width: cell.column.getSize(),
											alignItems: "center",
										}}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
