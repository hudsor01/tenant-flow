/**
 * DataTableFacetedFilter option checkbox: a selected option fills its box with
 * `bg-primary` and draws a Check. CommandItem colors every descendant icon
 * without a `text-` class `text-muted-foreground`, which on `bg-primary`
 * read 1.26:1 light and 1.19:1 dark, so the Check carries its own
 * `text-primary-foreground`: 4.88:1 light, 6.84:1 dark (66.2-39 VD-56).
 * Rendered against a real TanStack column (no hand-built stub).
 */

import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DataTableFacetedFilter } from "#components/data-table/data-table-faceted-filter";

type Row = { status: string };

const COLUMNS: ColumnDef<Row>[] = [
	{ accessorKey: "status", enableColumnFilter: true },
];

const OPTIONS = [
	{ label: "Active", value: "active" },
	{ label: "Vacant", value: "vacant" },
];

function Harness() {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
		{ id: "status", value: ["active"] },
	]);
	const table = useReactTable({
		data: [{ status: "active" }, { status: "vacant" }],
		columns: COLUMNS,
		state: { columnFilters },
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});
	const column = table.getColumn("status");
	if (!column) {
		throw new Error("no status column");
	}
	return (
		<DataTableFacetedFilter
			column={column}
			title="Status"
			options={OPTIONS}
			multiple
		/>
	);
}

function optionBox(label: string): HTMLElement {
	const option = screen.getByRole("option", { name: label });
	const box = option.querySelector("div");
	if (!(box instanceof HTMLElement)) {
		throw new Error(`no checkbox box in the ${label} option`);
	}
	return box;
}

describe("DataTableFacetedFilter option checkbox", () => {
	it("draws the selected option's Check in the primary-foreground token", () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: /^Status/ }));

		const selected = optionBox("Active");
		expect(selected).toHaveClass("bg-primary");
		const check = selected.querySelector("svg");
		expect(check).not.toBeNull();
		expect(check?.getAttribute("class")).toContain("text-primary-foreground");

		const unselected = optionBox("Vacant");
		expect(unselected).not.toHaveClass("bg-primary");
		expect(unselected).toHaveClass("opacity-50");
	});
});
