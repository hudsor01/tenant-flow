"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect } from "react";
import { DataTable } from "#components/data-table/data-table";
import { DataTableToolbar } from "#components/data-table/data-table-toolbar";
import { Button } from "#components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { useDataTable } from "#hooks/use-data-table";
import type { MaintenanceDisplayRequest } from "#types/sections/maintenance";

const PAGE_SIZE = 10;

interface MaintenanceTableClientProps {
	columns: ColumnDef<MaintenanceDisplayRequest>[];
	initialRequests: MaintenanceDisplayRequest[];
}

export function MaintenanceTableClient({
	columns,
	initialRequests,
}: MaintenanceTableClientProps) {
	// use-data-table hard-codes manualPagination, so it renders exactly the rows
	// it is handed — it does not slice. Do the paging here: read the same `page`
	// URL param the hook drives and hand it only the current page's window, so the
	// Next/Prev controls actually change the visible rows instead of the footer
	// silently disagreeing with an unpaged list. Safe to slice before the hook
	// because this table is neither sorted (non-sortable columns) nor filtered
	// here (search is applied by the parent before `initialRequests` arrives).
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
	// Honor the "Rows per page" selector: use-data-table writes the chosen size to
	// the `perPage` URL param, so read it here and slice by the same value (never a
	// hard-coded PAGE_SIZE) — otherwise the selector updates the footer while the
	// visible window stays 10.
	const [perPage] = useQueryState(
		"perPage",
		parseAsInteger.withDefault(PAGE_SIZE),
	);
	const pageSize = perPage > 0 ? perPage : PAGE_SIZE;
	const pageCount = Math.max(1, Math.ceil(initialRequests.length / pageSize));
	const currentPage = Math.min(Math.max(1, page), pageCount);

	// Reset an out-of-range page (e.g. after a search shrinks the list) so the
	// footer never shows "Page 5 of 2".
	useEffect(() => {
		if (page !== currentPage) {
			void setPage(currentPage === 1 ? null : currentPage);
		}
	}, [page, currentPage, setPage]);

	const pageData = initialRequests.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize,
	);

	const { table } = useDataTable({
		data: pageData,
		columns,
		pageCount,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: PAGE_SIZE,
			},
		},
	});

	return (
		<Card>
			<CardHeader className="flex-between flex-row">
				<div>
					<CardTitle>Maintenance Requests</CardTitle>
					<CardDescription>
						Track maintenance tickets and resolution progress
					</CardDescription>
				</div>
				<Button asChild>
					<Link href="/maintenance/new">
						<Plus className="size-4" />
						New Request
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			</CardContent>
		</Card>
	);
}
