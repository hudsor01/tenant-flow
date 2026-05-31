/**
 * Pin the DataTablePagination selection-summary contract.
 *
 * - Default (`showSelectedCount` unset): renders "N of M row(s) selected" so
 *   existing selectable consumers (leases, etc.) are unchanged.
 * - `showSelectedCount={false}`: suppresses the summary for tables without a
 *   selection column (the dashboard portfolio), where the count is always
 *   "0 of N" and misleading. The pagination controls still render.
 */

import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTablePagination } from "#components/data-table/data-table-pagination";

interface Row {
	id: string;
}

const columns: ColumnDef<Row>[] = [{ id: "id", accessorKey: "id" }];

function PaginationHarness({
	showSelectedCount,
}: {
	showSelectedCount?: boolean;
}) {
	const table = useReactTable({
		data: [{ id: "a" }, { id: "b" }, { id: "c" }],
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});
	return (
		<DataTablePagination
			table={table}
			{...(showSelectedCount === undefined ? {} : { showSelectedCount })}
		/>
	);
}

describe("DataTablePagination", () => {
	it("renders the selection summary by default (existing consumers unchanged)", () => {
		render(<PaginationHarness />);
		expect(screen.getByText(/row\(s\) selected/i)).toBeInTheDocument();
		expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
	});

	it("suppresses the selection summary when showSelectedCount is false", () => {
		render(<PaginationHarness showSelectedCount={false} />);
		expect(screen.queryByText(/row\(s\) selected/i)).toBeNull();
		// Pagination controls still render.
		expect(screen.getByText(/rows per page/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /go to next page/i }),
		).toBeInTheDocument();
	});
});
