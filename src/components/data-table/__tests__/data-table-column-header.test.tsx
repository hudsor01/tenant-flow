/**
 * Pin the DT-03 / B-1 accessibility contract for the vendored column header.
 *
 * - `getAriaSort(column)` maps `column.getIsSorted()` → none|ascending|descending.
 * - The sort trigger is a focusable <button> reachable by Tab; Enter/Space toggle sort.
 * - The trigger carries the UI-SPEC focus ring (focus-visible:outline-2 outline-offset-2 outline-ring).
 * - The button does NOT carry aria-sort (B-1: aria-sort lives on the <th role=columnheader>, not the button).
 * - A non-sortable, non-hideable column renders a plain label (no button, no aria-sort).
 * - W-1 smoke: the existing units-table 2nd consumer still renders + sorts with no console.error.
 */

import {
	type Column,
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unitColumns } from "#app/(owner)/properties/units/columns";
import {
	DataTableColumnHeader,
	getAriaSort,
} from "#components/data-table/data-table-column-header";
import type { UnitRowWithRelations } from "#types/core";

type Row = { name: string; value: number };

const COLUMNS: ColumnDef<Row>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Name" />
		),
		cell: ({ row }) => row.original.name,
		enableSorting: true,
		enableHiding: true,
	},
	{
		accessorKey: "value",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Value" />
		),
		cell: ({ row }) => row.original.value,
		enableSorting: false,
		enableHiding: false,
	},
];

/**
 * Minimal harness that flexRenders a real TanStack table's headers into <th>
 * elements carrying aria-sort={getAriaSort(column)} — exactly the Plan-05-02
 * wiring — so getAriaSort + the header button are exercised against a genuine
 * column instance (no `as unknown as` hand-built stubs).
 */
function Harness<TData>({ columns }: { columns: ColumnDef<TData>[] }) {
	const table = useReactTable({
		data: [] as TData[],
		columns,
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
		</table>
	);
}

/**
 * Capture the live `Column` instance on every render so direct getAriaSort
 * assertions read the post-re-render instance (not a stale closure snapshot).
 */
function captureColumn(onColumn: (column: Column<Row, unknown>) => void) {
	const cols: ColumnDef<Row>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				onColumn(column);
				return <DataTableColumnHeader column={column} label="Name" />;
			},
			enableSorting: true,
		},
	];
	// Render the captured column's aria-sort onto a real <th role=columnheader>
	// so assertions can read it off the DOM after a sort re-render.
	return <Harness columns={cols} />;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("getAriaSort", () => {
	it("maps unsorted → none, asc → ascending, desc → descending", () => {
		let column: Column<Row, unknown> | undefined;
		render(captureColumn((c) => (column = c)));
		expect(column).toBeDefined();

		// The <th> carries aria-sort={getAriaSort(column)} (the Plan-05-02 wiring),
		// so reading it back proves the helper's mapping across re-renders.
		const th = screen.getByRole("columnheader", { name: /name/i });
		expect(th.getAttribute("aria-sort")).toBe("none");
		expect(getAriaSort(column as Column<Row, unknown>)).toBe("none");

		act(() => {
			(column as Column<Row, unknown>).toggleSorting(false); // asc
		});
		expect(th.getAttribute("aria-sort")).toBe("ascending");
		expect(getAriaSort(column as Column<Row, unknown>)).toBe("ascending");

		act(() => {
			(column as Column<Row, unknown>).toggleSorting(true); // desc
		});
		expect(th.getAttribute("aria-sort")).toBe("descending");
		expect(getAriaSort(column as Column<Row, unknown>)).toBe("descending");
	});
});

describe("DataTableColumnHeader keyboard sort", () => {
	it("toggles sorting on Enter and Space on the header button", () => {
		render(<Harness columns={COLUMNS} />);
		const button = screen.getByRole("button", { name: /name/i });
		const th = screen.getByRole("columnheader", { name: /name/i });

		expect(th.getAttribute("aria-sort")).toBe("none");

		fireEvent.keyDown(button, { key: "Enter" });
		expect(th.getAttribute("aria-sort")).toBe("ascending");

		fireEvent.keyDown(button, { key: " " });
		expect(th.getAttribute("aria-sort")).toBe("descending");
	});

	it("carries the UI-SPEC focus ring classes on the trigger", () => {
		render(<Harness columns={COLUMNS} />);
		const button = screen.getByRole("button", { name: /name/i });
		expect(button.className).toContain("focus-visible:outline-2");
		expect(button.className).toContain("outline-offset-2");
		expect(button.className).toContain("outline-ring");
	});

	it("does NOT set aria-sort on the button (B-1)", () => {
		render(<Harness columns={COLUMNS} />);
		const button = screen.getByRole("button", { name: /name/i });
		expect(button.getAttribute("aria-sort")).toBeNull();
	});
});

describe("DataTableColumnHeader non-sortable column", () => {
	it("renders a plain label with no button when not sortable or hideable", () => {
		render(<Harness columns={COLUMNS} />);
		// "Value" column: enableSorting:false + enableHiding:false → plain label.
		expect(screen.queryByRole("button", { name: /value/i })).toBeNull();
		expect(screen.getByText("Value")).toBeInTheDocument();
	});
});

describe("W-1 units-table 2nd consumer", () => {
	it("renders the 7 unit headers and sorts with no console.error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		render(<Harness<UnitRowWithRelations> columns={unitColumns} />);

		// 7 unit columns → 7 header cells.
		expect(screen.getAllByRole("columnheader")).toHaveLength(7);

		// A sortable header (Rent) is keyboard-togglable without error.
		const rentButton = screen.getByRole("button", { name: /rent/i });
		fireEvent.keyDown(rentButton, { key: "Enter" });

		expect(errorSpy).not.toHaveBeenCalled();
	});
});
