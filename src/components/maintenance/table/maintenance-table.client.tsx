"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
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

interface MaintenanceTableClientProps {
	columns: ColumnDef<MaintenanceDisplayRequest>[];
	initialRequests: MaintenanceDisplayRequest[];
}

export function MaintenanceTableClient({
	columns,
	initialRequests,
}: MaintenanceTableClientProps) {
	const { table } = useDataTable({
		data: initialRequests,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10,
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
