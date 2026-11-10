/**
 * Pin the DT-03/DT-04/DT-05 + W-3 portfolio column-model contract.
 *
 * - Exports exactly 6 columns (property, units, occupancy, rent, maintenance, actions):
 *   no tenants column, which repeated the occupied units as "N tenants" (66.2-39).
 * - Sortable flags: property/units/occupancy/rent sortable; maintenance/actions not.
 * - W-3: the Property filterFn matches NAME or ADDRESS (case-insensitive substring),
 *   so an address-only match passes and a no-match fails (search-parity guard).
 * - DT-04: the occupancy column is faceted-filterable (enableColumnFilter +
 *   meta.variant + meta.options occupied/partly-vacant/vacant/no-units).
 * - DT-05: every column has meta.label; actions is enableHiding:false.
 * - B-1: rendered through a real table whose <th> carry aria-sort={getAriaSort(column)},
 *   the sortable header's <th role=columnheader> exposes aria-sort (NOT the inner button);
 *   cells render formatCurrency rent, occupied/total units, "--" for no open request.
 */

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type Row,
	type SortingFn,
	useReactTable,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { portfolioColumns } from "#components/dashboard/components/portfolio-columns";
import type { PortfolioRow } from "#components/dashboard/dashboard-types";
import { getAriaSort } from "#components/data-table/data-table-column-header";
import { formatCurrency } from "#lib/utils/currency";

function makeRow(overrides: Partial<PortfolioRow> = {}): PortfolioRow {
	return {
		id: "prop-1",
		property: "Maple Court",
		address: "123 Elm Street",
		units: { occupied: 3, total: 4 },
		occupancy: "occupied",
		rent: 1850,
		maintenanceOpen: 0,
		...overrides,
	};
}

function findColumn(id: string): ColumnDef<PortfolioRow> {
	const col = portfolioColumns.find((c) => c.id === id);
	if (!col) throw new Error(`column ${id} not found`);
	return col;
}

/** Minimal table harness exercising the Plan-05-02 <th aria-sort={...}> wiring. */
function Harness({ row }: { row: PortfolioRow }) {
	const table = useReactTable({
		data: [row],
		columns: portfolioColumns,
		getRowId: (r) => r.id,
		getCoreRowModel: getCoreRowModel(),
	});
	return (
		<table>
			<thead>
				{table.getHeaderGroups().map((hg) => (
					<tr key={hg.id}>
						{hg.headers.map((header) => (
							<th key={header.id} aria-sort={getAriaSort(header.column)}>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
							</th>
						))}
					</tr>
				))}
			</thead>
			<tbody>
				{table.getRowModel().rows.map((r) => (
					<tr key={r.id}>
						{r.getVisibleCells().map((cell) => (
							<td key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}

describe("portfolioColumns", () => {
	it("exports 6 columns with the expected ids, no tenants column", () => {
		expect(portfolioColumns).toHaveLength(6);
		const ids = portfolioColumns.map((c) => c.id);
		expect(ids).toEqual([
			"property",
			"units",
			"occupancy",
			"rent",
			"maintenance",
			"actions",
		]);
	});

	it("sets sortable flags correctly", () => {
		expect(findColumn("property").enableSorting).toBe(true);
		expect(findColumn("units").enableSorting).toBe(true);
		expect(findColumn("occupancy").enableSorting).toBe(true);
		expect(findColumn("rent").enableSorting).toBe(true);
		expect(findColumn("maintenance").enableSorting).toBe(false);
		expect(findColumn("actions").enableSorting).toBe(false);
	});

	it("Property column sorts case-INsensitively for a SMALL (<=10) row set (parity with localeCompare)", () => {
		// Regression guard: the deleted hand-rolled table sorted Property via
		// `a.property.localeCompare(b.property)` (locale-aware + case-insensitive).
		// Without an explicit sortingFn TanStack uses `auto`, which for <=10 filtered
		// rows falls back to the case-SENSITIVE `basic` fn ("Zebra" before "abby").
		// property is ALSO the default-sorted column, so users hit this on first paint.
		const property = findColumn("property");
		expect(typeof property.sortingFn).toBe("function");

		// Drive a REAL sorted table with a SMALL (<=10) mixed-case dataset. With the
		// case-sensitive `basic` fallback "Zebra Towers" would sort FIRST (uppercase
		// 'Z' < lowercase 'a'); the explicit localeCompare sortingFn puts "abby Court"
		// first. This assertion FAILS without the sortingFn and passes with it.
		const rows: PortfolioRow[] = [
			makeRow({ id: "z", property: "Zebra Towers" }),
			makeRow({ id: "a", property: "abby Court" }),
			makeRow({ id: "m", property: "Maple" }),
		];

		function SortedHarness() {
			const table = useReactTable({
				data: rows,
				columns: portfolioColumns,
				getRowId: (r) => r.id,
				getCoreRowModel: getCoreRowModel(),
				getSortedRowModel: getSortedRowModel(),
				initialState: { sorting: [{ id: "property", desc: false }] },
			});
			return (
				<ul>
					{table.getRowModel().rows.map((r) => (
						<li key={r.id}>{r.original.property}</li>
					))}
				</ul>
			);
		}

		render(<SortedHarness />);
		const order = screen.getAllByRole("listitem").map((li) => li.textContent);
		expect(order).toEqual(["abby Court", "Maple", "Zebra Towers"]);

		// Belt-and-braces: the sortingFn itself is row-count independent + case-fold.
		const sortingFn = property.sortingFn as SortingFn<PortfolioRow>;
		const rowZ = {
			original: makeRow({ property: "Zebra Towers" }),
		} as Row<PortfolioRow>;
		const rowA = {
			original: makeRow({ property: "abby Court" }),
		} as Row<PortfolioRow>;
		expect(sortingFn(rowZ, rowA, "property")).toBeGreaterThan(0);
		expect(sortingFn(rowA, rowZ, "property")).toBeLessThan(0);
	});

	it("Property filterFn matches name OR address (W-3 search parity)", () => {
		const property = findColumn("property");
		expect(typeof property.filterFn).toBe("function");
		const filterFn = property.filterFn as (
			row: Row<PortfolioRow>,
			columnId: string,
			value: unknown,
		) => boolean;

		// address-only match (query is in the ADDRESS, not the name).
		const addressRow = {
			original: makeRow({ property: "Maple Court", address: "999 Oak Avenue" }),
		} as Row<PortfolioRow>;
		expect(filterFn(addressRow, "property", "oak")).toBe(true);

		// name match.
		const nameRow = {
			original: makeRow({ property: "Oak Towers", address: "1 First St" }),
		} as Row<PortfolioRow>;
		expect(filterFn(nameRow, "property", "oak")).toBe(true);

		// no match in either name or address.
		const noMatch = {
			original: makeRow({ property: "Maple Court", address: "123 Elm Street" }),
		} as Row<PortfolioRow>;
		expect(filterFn(noMatch, "property", "zzz")).toBe(false);
	});

	it("occupancy column is faceted-filterable from the one label map (DT-04)", () => {
		const occupancy = findColumn("occupancy");
		expect(occupancy.enableColumnFilter).toBe(true);
		const variant = occupancy.meta?.variant;
		expect(variant === "select" || variant === "multiSelect").toBe(true);
		expect(occupancy.meta?.options).toEqual([
			{ label: "Occupied", value: "occupied" },
			{ label: "Partly vacant", value: "partly-vacant" },
			{ label: "Vacant", value: "vacant" },
			{ label: "No units", value: "no-units" },
		]);
	});

	it("occupancy filterFn includes rows whose occupancy is in the selected values", () => {
		const occupancy = findColumn("occupancy");
		const filterFn = occupancy.filterFn as (
			row: Row<PortfolioRow>,
			columnId: string,
			value: unknown,
		) => boolean;
		const partlyVacantRow = {
			original: makeRow({ occupancy: "partly-vacant" }),
		} as Row<PortfolioRow>;
		expect(
			filterFn(partlyVacantRow, "occupancy", ["partly-vacant", "vacant"]),
		).toBe(true);
		expect(filterFn(partlyVacantRow, "occupancy", ["occupied"])).toBe(false);
	});

	it("every column has meta.label and actions is not hideable (DT-05)", () => {
		for (const col of portfolioColumns) {
			expect(typeof col.meta?.label).toBe("string");
			expect((col.meta?.label ?? "").length).toBeGreaterThan(0);
		}
		expect(findColumn("actions").enableHiding).toBe(false);
	});

	it("Actions Edit link surfaces on keyboard focus, not only hover (a11y)", () => {
		// The Actions cell is opacity-0 until row hover. Keyboard users tabbing to
		// the Edit link would never see it without a focus-visible restore, so the
		// wrapper must carry focus-within/group-focus-within opacity overrides while
		// KEEPING the hover behavior.
		render(<Harness row={makeRow({ id: "edit-1" })} />);

		const editLink = screen.getByRole("link", { name: /edit/i });
		const actionsWrapper = editLink.parentElement as HTMLElement;
		// Hover behavior is preserved.
		expect(actionsWrapper.className).toContain("group-hover:opacity-100");
		// Keyboard focus now reveals it (focus-within on the cell + group-focus-within
		// on the row). Without these classes the link is permanently opacity-0 for
		// keyboard users.
		expect(actionsWrapper.className).toContain("focus-within:opacity-100");
		expect(actionsWrapper.className).toContain(
			"group-focus-within:opacity-100",
		);
	});

	it("renders cells + exposes aria-sort on the <th> (B-1)", () => {
		render(<Harness row={makeRow({ maintenanceOpen: 0, rent: 1850 })} />);

		// rent cell uses formatCurrency with 0 fraction digits.
		const rentText = formatCurrency(1850, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});
		expect(screen.getByText(rentText)).toBeInTheDocument();

		// units cell renders occupied/total, the row's only count of its units:
		// no "Tenants" header and no "N tenants" cell beside it.
		expect(screen.getByText("3/4")).toBeInTheDocument();
		expect(screen.queryByRole("columnheader", { name: /tenants/i })).toBeNull();
		expect(screen.queryByText(/\btenants?\b/i)).toBeNull();

		// no open request renders the muted "--" placeholder, hidden from
		// assistive tech, beside sr-only text that says what it means. An
		// aria-label on the role-less span would not be announced (66.2-39).
		const placeholder = screen.getByText("No open requests");
		expect(placeholder).toHaveClass("sr-only");
		expect(placeholder.previousElementSibling).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(placeholder.parentElement).not.toHaveAttribute("aria-label");

		// the sortable Property header's <th> exposes aria-sort (NOT the button).
		const th = screen.getByRole("columnheader", { name: /property/i });
		expect(["none", "ascending", "descending"]).toContain(
			th.getAttribute("aria-sort"),
		);
		const button = screen.getByRole("button", { name: /property/i });
		expect(button.getAttribute("aria-sort")).toBeNull();
	});
});
