"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "#components/data-table/data-table";
import { DataTableToolbar } from "#components/data-table/data-table-toolbar";
import { useClientDataTable } from "#hooks/use-client-data-table";
import { formatCurrency, formatNumber } from "#lib/utils/currency";
import type { LeaseFinancialInsight } from "#types/analytics";

export function LeaseTable({ leases }: { leases: LeaseFinancialInsight[] }) {
	const columns: ColumnDef<LeaseFinancialInsight>[] = [
		{
			id: "lease_id",
			accessorKey: "lease_id",
			header: "Lease",
			meta: {
				label: "Lease ID",
				variant: "text",
				placeholder: "Search lease...",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<span className="font-medium">{row.original.lease_id}</span>
			),
		},
		{
			id: "tenantName",
			accessorKey: "tenantName",
			header: "Tenant",
			meta: {
				label: "Tenant",
				variant: "text",
				placeholder: "Search tenant...",
			},
			enableColumnFilter: true,
		},
		{
			id: "propertyName",
			accessorKey: "propertyName",
			header: "Property",
			meta: {
				label: "Property",
				variant: "text",
				placeholder: "Search property...",
			},
			enableColumnFilter: true,
		},
		{
			id: "rent_amount",
			accessorKey: "rent_amount",
			header: "Monthly Rent",
			meta: {
				label: "Monthly Rent",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{formatCurrency(row.original.rent_amount)}
				</div>
			),
		},
		{
			id: "outstandingBalance",
			accessorKey: "outstandingBalance",
			header: "Outstanding",
			meta: {
				label: "Outstanding Balance",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{formatCurrency(row.original.outstandingBalance)}
				</div>
			),
		},
		{
			id: "profitabilityScore",
			accessorKey: "profitabilityScore",
			header: "Profitability",
			meta: {
				label: "Profitability Score",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.profitabilityScore !== null &&
					row.original.profitabilityScore !== undefined
						? formatNumber(row.original.profitabilityScore, {
								maximumFractionDigits: 1,
							})
						: "-"}
				</div>
			),
		},
	];

	const { table } = useClientDataTable({
		data: leases,
		columns,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 6,
			},
		},
	});

	if (!leases.length) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed">
				<p className="text-muted-foreground">
					No lease financial analytics available yet.
				</p>
			</div>
		);
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	);
}
