"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "#components/data-table/data-table";
import { DataTableToolbar } from "#components/data-table/data-table-toolbar";
import { useClientDataTable } from "#hooks/use-client-data-table";
import {
	formatCurrency,
	formatNumber,
	formatPercentage,
} from "#lib/utils/currency";
import type { PropertyPerformanceEntry } from "#types/analytics";

export function TopPropertiesTable({
	properties,
}: {
	properties: PropertyPerformanceEntry[];
}) {
	const columns: ColumnDef<PropertyPerformanceEntry>[] = [
		{
			id: "propertyName",
			accessorKey: "propertyName",
			header: "Property",
			meta: {
				label: "Property Name",
				variant: "text",
				placeholder: "Search property...",
			},
			enableColumnFilter: true,
		},
		{
			id: "occupancyRate",
			accessorKey: "occupancyRate",
			header: "Occupancy",
			meta: {
				label: "Occupancy Rate",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{formatPercentage(row.original.occupancyRate)}
				</div>
			),
		},
		{
			id: "units",
			header: "Units",
			cell: ({ row }) => (
				<div className="text-right">
					{formatNumber(row.original.occupiedUnits)}/
					{formatNumber(row.original.totalUnits)}
				</div>
			),
		},
		{
			id: "monthlyRevenue",
			accessorKey: "monthlyRevenue",
			header: "Monthly revenue",
			meta: {
				label: "Monthly Revenue",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{formatCurrency(row.original.monthlyRevenue)}
				</div>
			),
		},
	];

	const { table } = useClientDataTable({
		data: properties,
		columns,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 6,
			},
		},
	});

	if (!properties.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No property data available
			</div>
		);
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	);
}
