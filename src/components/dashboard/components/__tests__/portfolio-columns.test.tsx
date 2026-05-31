/**
 * Pin the DT-03/DT-04/DT-05 + W-3 portfolio column-model contract.
 *
 * - Exports exactly 7 columns (property, units, tenant, status, rent, maintenance, actions).
 * - Sortable flags: property/units/status/rent sortable; tenant/maintenance/actions not.
 * - W-3: the Property filterFn matches NAME or ADDRESS (case-insensitive substring),
 *   so an address-only match passes and a no-match fails (search-parity guard).
 * - DT-04: status column is faceted-filterable (enableColumnFilter + meta.variant +
 *   meta.options active/expiring/vacant).
 * - DT-05: every column has meta.label; actions is enableHiding:false.
 * - B-1: rendered through a real table whose <th> carry aria-sort={getAriaSort(column)},
 *   the sortable header's <th role=columnheader> exposes aria-sort (NOT the inner button);
 *   cells render formatCurrency rent, occupied/total units, "--" for null tenant.
 */

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type Row,
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
		tenant: "Jane Doe",
		leaseStatus: "active",
		leaseEnd: null,
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
	it("exports 7 columns with the expected ids", () => {
		expect(portfolioColumns).toHaveLength(7);
		const ids = portfolioColumns.map((c) => c.id);
		expect(ids).toEqual([
			"property",
			"units",
			"tenant",
			"status",
			"rent",
			"maintenance",
			"actions",
		]);
	});

	it("sets sortable flags correctly", () => {
		expect(findColumn("property").enableSorting).not.toBe(false);
		expect(findColumn("units").enableSorting).not.toBe(false);
		expect(findColumn("status").enableSorting).not.toBe(false);
		expect(findColumn("rent").enableSorting).not.toBe(false);
		expect(findColumn("tenant").enableSorting).toBe(false);
		expect(findColumn("maintenance").enableSorting).toBe(false);
		expect(findColumn("actions").enableSorting).toBe(false);
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

	it("status column is faceted-filterable (DT-04)", () => {
		const status = findColumn("status");
		expect(status.enableColumnFilter).toBe(true);
		const variant = status.meta?.variant;
		expect(variant === "select" || variant === "multiSelect").toBe(true);
		const optionValues = (status.meta?.options ?? []).map((o) => o.value);
		expect(optionValues).toContain("active");
		expect(optionValues).toContain("expiring");
		expect(optionValues).toContain("vacant");
	});

	it("status filterFn includes rows whose status is in the selected values", () => {
		const status = findColumn("status");
		const filterFn = status.filterFn as (
			row: Row<PortfolioRow>,
			columnId: string,
			value: unknown,
		) => boolean;
		const expiringRow = {
			original: makeRow({ leaseStatus: "expiring" }),
		} as Row<PortfolioRow>;
		expect(filterFn(expiringRow, "status", ["expiring", "vacant"])).toBe(true);
		expect(filterFn(expiringRow, "status", ["active"])).toBe(false);
	});

	it("every column has meta.label and actions is not hideable (DT-05)", () => {
		for (const col of portfolioColumns) {
			expect(typeof col.meta?.label).toBe("string");
			expect((col.meta?.label ?? "").length).toBeGreaterThan(0);
		}
		expect(findColumn("actions").enableHiding).toBe(false);
	});

	it("renders cells + exposes aria-sort on the <th> (B-1)", () => {
		render(<Harness row={makeRow({ tenant: null, rent: 1850 })} />);

		// rent cell uses formatCurrency with 0 fraction digits.
		const rentText = formatCurrency(1850, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});
		expect(screen.getByText(rentText)).toBeInTheDocument();

		// units cell renders occupied/total.
		expect(screen.getByText("3/4")).toBeInTheDocument();

		// null tenant renders the muted "--" placeholder.
		expect(screen.getByLabelText("No tenants")).toBeInTheDocument();

		// the sortable Property header's <th> exposes aria-sort (NOT the button).
		const th = screen.getByRole("columnheader", { name: /property/i });
		expect(["none", "ascending", "descending"]).toContain(
			th.getAttribute("aria-sort"),
		);
		const button = screen.getByRole("button", { name: /property/i });
		expect(button.getAttribute("aria-sort")).toBeNull();
	});
});
