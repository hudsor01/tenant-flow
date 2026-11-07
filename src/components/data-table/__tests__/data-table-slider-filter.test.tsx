/**
 * DataTableSliderFilter popover title: the `p` is a flex item of the popover's
 * `flex flex-col gap-3` column, where the unscoped `@layer base`
 * `p { margin-bottom: 1rem }` does not collapse and would add 16px to the
 * 12px gap. Asserted on the computed value through `computeParagraphCascade`,
 * against a real TanStack column (no hand-built stub).
 */

import {
	type ColumnDef,
	getCoreRowModel,
	getFacetedMinMaxValues,
	getFacetedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTableSliderFilter } from "#components/data-table/data-table-slider-filter";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

type Row = { rent: number };

const COLUMNS: ColumnDef<Row>[] = [
	{
		accessorKey: "rent",
		meta: { range: [0, 5000] },
		enableColumnFilter: true,
	},
];

function Harness() {
	const table = useReactTable({
		data: [{ rent: 1200 }, { rent: 2400 }],
		columns: COLUMNS,
		getCoreRowModel: getCoreRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedMinMaxValues: getFacetedMinMaxValues(),
	});
	const column = table.getColumn("rent");
	if (!column) {
		throw new Error("no rent column");
	}
	return <DataTableSliderFilter column={column} title="Rent" />;
}

describe("DataTableSliderFilter popover title", () => {
	it("cancels the base p margin on the flex-item title", () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: /Rent/ }));

		const dialog = screen.getByRole("dialog");
		const title = [...dialog.querySelectorAll("p")].find(
			(node) => node.textContent === "Rent",
		);
		if (title === undefined) {
			throw new Error("no Rent title p in the popover");
		}
		const column = title.parentElement;
		expect(column?.className.split(/\s+/)).toEqual(
			expect.arrayContaining(["flex", "flex-col", "gap-3"]),
		);

		const { neutralized, baseline } = computeParagraphCascade(title);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});
});
