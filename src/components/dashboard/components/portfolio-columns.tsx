"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { LeaseStatusBadge } from "#components/dashboard/components/lease-status-badge";
import { DataTableColumnHeader } from "#components/data-table/data-table-column-header";
import { formatCurrency } from "#lib/utils/currency";
import type { PortfolioRow } from "../dashboard-types";

/**
 * Faceted-filter options for the Lease Status column (DT-04 source).
 * `DataTableFacetedFilter` reads these off `columnMeta.options` in Plan 05-02.
 */
const STATUS_OPTIONS = [
	{ label: "Active", value: "active" },
	{ label: "Expiring Soon", value: "expiring" },
	{ label: "Vacant", value: "vacant" },
] as const;

/** Open-maintenance cell: red count when > 0, muted "--" otherwise. */
function MaintenanceCell({ openCount }: { openCount: number }) {
	if (openCount > 0) {
		return (
			<span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-500">
				{openCount} open
			</span>
		);
	}
	return (
		<span
			aria-label="No open requests"
			className="text-sm text-muted-foreground"
		>
			--
		</span>
	);
}

/**
 * The 7-column portfolio table model (DT-03).
 *
 * - Property/Units/Lease Status/Monthly Rent are sortable; Tenants/Maintenance/
 *   Actions are not.
 * - Property carries a custom name||address filterFn (W-3 search parity). Search
 *   filters this column, so its id "property" is the pinned nuqs search key.
 * - Lease Status carries faceted metadata (DT-04) + an array-membership filterFn.
 * - Every column has meta.label for DataTableViewOptions (DT-05).
 */
export const portfolioColumns: ColumnDef<PortfolioRow>[] = [
	{
		id: "property",
		accessorKey: "property",
		// Explicit column.getSize() widths drive BOTH header and body cells in the
		// virtualized display:grid/flex table (the alignment source of truth).
		size: 240,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Property" />
		),
		meta: { label: "Property" },
		enableSorting: true,
		enableColumnFilter: true,
		// Explicit case-insensitive, locale-aware sort matching the prior dashboard's
		// `a.property.localeCompare(b.property)`. Without it TanStack's `auto` sortingFn
		// inspects flatRows.slice(10) and, for <=10 filtered rows, falls back to the
		// case-SENSITIVE `basic` fn ("Zebra" before "abby") — diverging from parity.
		// property is ALSO the default-sorted column, so this is hit on first paint.
		sortingFn: (rowA, rowB) =>
			rowA.original.property.localeCompare(rowB.original.property),
		// W-3: match the search string against NAME or ADDRESS (case-insensitive
		// substring), preserving dashboard.tsx parity. A default substring filter
		// on the property accessor alone would drop address matches (regression).
		filterFn: (row, _columnId, value) => {
			const query = String(value).toLowerCase();
			const name = (row.original.property ?? "").toLowerCase();
			const address = (row.original.address ?? "").toLowerCase();
			return name.includes(query) || address.includes(query);
		},
		cell: ({ row }) => (
			<div className="min-w-0">
				<div className="truncate font-medium">{row.original.property}</div>
				<div className="truncate text-muted-foreground text-xs">
					{row.original.address}
				</div>
			</div>
		),
	},
	{
		id: "units",
		accessorKey: "units",
		size: 90,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Units" />
		),
		meta: { label: "Units" },
		enableSorting: true,
		// Hand-rolled dashboard sorts units by occupied count.
		sortingFn: (rowA, rowB) =>
			rowA.original.units.occupied - rowB.original.units.occupied,
		cell: ({ row }) => (
			<span className="tabular-nums">
				{row.original.units.occupied}/{row.original.units.total}
				<span className="ml-1 text-xs text-muted-foreground">occupied</span>
			</span>
		),
	},
	{
		id: "tenant",
		accessorKey: "tenant",
		size: 140,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Tenants" />
		),
		meta: { label: "Tenants" },
		enableSorting: false,
		cell: ({ row }) =>
			row.original.tenant ? (
				<span className="text-sm">{row.original.tenant}</span>
			) : (
				<span aria-label="No tenants" className="text-sm text-muted-foreground">
					--
				</span>
			),
	},
	{
		id: "status",
		accessorKey: "leaseStatus",
		size: 120,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Lease Status" />
		),
		meta: {
			label: "Lease Status",
			variant: "multiSelect",
			options: [...STATUS_OPTIONS],
		},
		enableSorting: true,
		// Explicit localeCompare for the same reason as the Property column: the
		// default `auto` sortingFn falls back to case-sensitive `basic` for <=10
		// filtered rows. Status values are lowercase today so the order matches,
		// but pinning it keeps parity with the deleted table and hardens against
		// any future status-label casing change (symmetric with `property`).
		sortingFn: (rowA, rowB) =>
			rowA.original.leaseStatus.localeCompare(rowB.original.leaseStatus),
		enableColumnFilter: true,
		// Faceted filter writes a string[] of selected statuses; include the row
		// when its lease status is among them.
		filterFn: (row, _columnId, value) => {
			if (!Array.isArray(value) || value.length === 0) return true;
			return (value as string[]).includes(row.original.leaseStatus);
		},
		cell: ({ row }) => <LeaseStatusBadge status={row.original.leaseStatus} />,
	},
	{
		id: "rent",
		accessorKey: "rent",
		size: 120,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Monthly Rent" />
		),
		meta: { label: "Monthly Rent", align: "right" },
		enableSorting: true,
		cell: ({ row }) => (
			<div className="text-right tabular-nums">
				{formatCurrency(row.original.rent, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				})}
			</div>
		),
	},
	{
		id: "maintenance",
		accessorKey: "maintenanceOpen",
		size: 110,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Maintenance" />
		),
		meta: { label: "Maintenance", align: "right" },
		enableSorting: false,
		cell: ({ row }) => (
			<MaintenanceCell openCount={row.original.maintenanceOpen} />
		),
	},
	{
		id: "actions",
		size: 80,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Actions" />
		),
		meta: { label: "Actions" },
		enableSorting: false,
		enableHiding: false,
		cell: ({ row }) => (
			<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100">
				<Link
					href={`/properties/${row.original.id}/edit`}
					className="rounded p-1.5 text-muted-foreground hover:text-foreground"
					aria-label={`Edit ${row.original.property}`}
				>
					Edit
				</Link>
			</div>
		),
	},
];
