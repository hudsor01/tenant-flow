/**
 * Unit Columns - Data Table Column Definitions
 *
 * This file defines the column structure for the units data table.
 * Component implementations are extracted into ./components/ for maintainability.
 */

import type { ColumnDef } from "@tanstack/react-table";
import { Bath, Bed, MapPin, Maximize2 } from "lucide-react";
import { DataTableColumnHeader } from "#components/data-table/data-table-column-header";
import type { UnitListRow } from "#hooks/api/query-keys/unit-keys";
import { formatCurrency } from "#lib/utils/currency";
import type { UnitStatus } from "#types/core";
import { UnitActions } from "./components/unit-actions";
// Import extracted components
import { statusConfig, UnitStatusBadge } from "./components/unit-status-badge";

/**
 * Column definitions for the units data table, over the rows
 * `unitQueries.list` returns (each with its property's name).
 * Uses TanStack Table with DiceUI DataTable enhancements
 */
export const unitColumns: ColumnDef<UnitListRow>[] = [
	{
		accessorKey: "unit_number",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Unit Details" />
		),
		meta: {
			label: "Unit",
			variant: "text",
			placeholder: "Search units...",
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const { propertyName } = row.original;
			return (
				<div className="flex flex-col gap-1 py-2">
					<div className="font-bold text-foreground">
						Unit {row.getValue("unit_number")}
					</div>
					{propertyName && (
						<div className="text-muted-foreground text-xs">
							<MapPin className="size-3 inline mr-1" />
							{propertyName}
						</div>
					)}
				</div>
			);
		},
		size: 160,
		enableHiding: false,
	},
	{
		accessorKey: "bedrooms",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bedrooms" />
		),
		meta: {
			label: "Bedrooms",
			variant: "range",
			range: [0, 10],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bedrooms = row.getValue("bedrooms") as number;
			return (
				<div className="flex items-center gap-1">
					<Bed className="size-3 text-muted-foreground" />
					<span className="font-medium">{bedrooms}</span>
				</div>
			);
		},
		size: 100,
	},
	{
		accessorKey: "bathrooms",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bathrooms" />
		),
		meta: {
			label: "Bathrooms",
			variant: "range",
			range: [0, 10],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bathrooms = row.getValue("bathrooms") as number;
			return (
				<div className="flex items-center gap-1">
					<Bath className="size-3 text-muted-foreground" />
					<span className="font-medium">{bathrooms}</span>
				</div>
			);
		},
		size: 100,
	},
	{
		accessorKey: "square_feet",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Size" />
		),
		meta: { label: "Size" },
		cell: ({ row }) => {
			const sqft = row.getValue("square_feet") as number | null;
			if (!sqft) return <span className="text-muted-foreground">-</span>;
			return (
				<div className="flex items-center gap-1">
					<Maximize2 className="size-3 text-muted-foreground" />
					<span className="text-xs">{sqft.toLocaleString()} ft²</span>
				</div>
			);
		},
		size: 100,
	},
	{
		accessorKey: "rent_amount",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Rent" />
		),
		meta: {
			label: "Rent",
			variant: "range",
			range: [0, 10000],
			unit: "$",
			formatValue: (value: number) =>
				formatCurrency(value, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				}),
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const rent = parseFloat(row.getValue("rent_amount"));
			const rentFormatted = formatCurrency(rent, { minimumFractionDigits: 0 });

			return (
				<div className="text-right space-y-1 py-2">
					<div className="font-bold text-foreground">{rentFormatted}</div>
					<div className="text-muted-foreground text-xs">per month</div>
				</div>
			);
		},
		size: 120,
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Status" />
		),
		meta: {
			label: "Status",
			variant: "select",
			options: [
				{ label: "Occupied", value: "occupied" },
				{ label: "Vacant", value: "available" },
				{ label: "Maintenance", value: "maintenance" },
				{ label: "Reserved", value: "reserved" },
			],
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const status = row.getValue("status") as UnitStatus;

			return (
				<div className="py-2">
					<UnitStatusBadge status={status} />
				</div>
			);
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id));
		},
		sortingFn: (rowA, rowB) => {
			const statusA = rowA.getValue("status") as UnitStatus;
			const statusB = rowB.getValue("status") as UnitStatus;
			return statusConfig[statusA].priority - statusConfig[statusB].priority;
		},
		size: 200,
	},
	{
		id: "actions",
		header: () => (
			<div className="text-center font-semibold text-muted-foreground">
				Actions
			</div>
		),
		cell: ({ row }) => <UnitActions unit={row.original} />,
		enableSorting: false,
		enableHiding: false,
		size: 80,
	},
];
