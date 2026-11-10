"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "#components/data-table/data-table";
import { DataTableToolbar } from "#components/data-table/data-table-toolbar";
import { useClientDataTable } from "#hooks/use-client-data-table";
import { formatDateWindow } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type {
	LeaseProfitability,
	LeaseProfitabilityRow,
} from "#types/analytics";
import { leaseProfitabilityLabel } from "../../../supabase/functions/_shared/financial-analytics-report";

const NO_LEASES: LeaseProfitabilityRow[] = [];

/**
 * Each lease's rent received less its expenses over the period
 * (get_financial_overview's `lease_profitability`, 20261110123124), largest
 * net first: the financial analytics page's and the leases page's table.
 * Before that migration the server reports none, and the table says it is
 * unavailable rather than showing an empty one.
 */
export function LeaseProfitabilityTable({
	profitability,
	pageSize,
}: {
	profitability: LeaseProfitability;
	pageSize: number;
}) {
	// The prop's own array (a copy each render would reset the table's page).
	const leases =
		profitability.status === "ready" ? profitability.leases : NO_LEASES;
	const columns: ColumnDef<LeaseProfitabilityRow>[] = [
		{
			id: "lease",
			accessorFn: (row) => leaseProfitabilityLabel(row),
			header: "Lease",
			meta: {
				label: "Lease",
				variant: "text",
				placeholder: "Search lease...",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<span className="font-medium">
					{leaseProfitabilityLabel({ ...row.original, tenantName: null })}
				</span>
			),
		},
		{
			id: "tenantName",
			accessorFn: (row) => row.tenantName ?? "",
			header: "Tenant",
			meta: {
				label: "Tenant",
				variant: "text",
				placeholder: "Search tenant...",
			},
			enableColumnFilter: true,
			cell: ({ row }) => row.original.tenantName ?? "-",
		},
		{
			id: "rentReceived",
			accessorKey: "rentReceived",
			header: "Rent Received",
			meta: { label: "Rent Received", variant: "number" },
			cell: ({ row }) => (
				<div className="text-right tabular-nums">
					{formatCurrency(row.original.rentReceived)}
				</div>
			),
		},
		{
			id: "expenses",
			accessorKey: "expenses",
			header: "Expenses",
			meta: { label: "Expenses", variant: "number" },
			cell: ({ row }) => (
				<div className="text-right tabular-nums">
					{formatCurrency(row.original.expenses)}
				</div>
			),
		},
		{
			id: "net",
			accessorKey: "net",
			header: "Net",
			meta: { label: "Net", variant: "number" },
			cell: ({ row }) => (
				<div className="text-right font-medium tabular-nums">
					{formatCurrency(row.original.net)}
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
				pageSize,
			},
		},
	});

	// mb-0 on every paragraph below: each is a flex item, where the base `p`
	// margin is added to the declared gap (and holds a state off centre).
	if (profitability.status === "unavailable") {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-4 text-center">
				<p className="mb-0 font-medium">Lease profitability unavailable</p>
				<p className="mb-0 text-sm text-muted-foreground">
					It comes from your rent ledger and expenses, which the server
					can&apos;t report per lease yet.
				</p>
			</div>
		);
	}

	const period = formatDateWindow(profitability.window);
	if (!leases.length) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
				<p className="mb-0 text-muted-foreground">
					No rent received or expenses on a lease from {period}.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="mb-0 text-sm text-muted-foreground">
				Rent received less expenses, {period}
			</p>
			<DataTable table={table}>
				<DataTableToolbar table={table} />
			</DataTable>
		</div>
	);
}
