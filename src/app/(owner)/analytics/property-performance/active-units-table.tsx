"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { unitStatusLabel } from "#app/(owner)/properties/units/components/unit-status-badge";
import { DataTable } from "#components/data-table/data-table";
import { DataTableToolbar } from "#components/data-table/data-table-toolbar";
import { Badge } from "#components/ui/badge";
import { useClientDataTable } from "#hooks/use-client-data-table";
import { formatCurrency, formatNumber } from "#lib/utils/currency";
import type { PropertyUnitDetail } from "#types/analytics";

/**
 * The units with their property named: `propertyNames` maps a property id to
 * the name the page's performance rows carry. The subtitle printed the unit's
 * property_id, a UUID; a unit whose property is not in the map gets none.
 */
export function ActiveUnitsTable({
	units,
	propertyNames,
}: {
	units: PropertyUnitDetail[];
	propertyNames: ReadonlyMap<string, string>;
}) {
	const columns: ColumnDef<PropertyUnitDetail>[] = [
		{
			id: "unit_number",
			accessorKey: "unit_number",
			header: "Unit",
			meta: {
				label: "Unit Number",
				variant: "text",
				placeholder: "Search unit...",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="flex flex-col">
					{row.original.unit_number === null ? (
						<span className="text-muted-foreground">No unit number</span>
					) : (
						<span className="font-medium">{row.original.unit_number}</span>
					)}
					{propertyNames.has(row.original.property_id) && (
						<span className="text-caption text-muted-foreground">
							{propertyNames.get(row.original.property_id)}
						</span>
					)}
				</div>
			),
		},
		{
			id: "status",
			accessorKey: "status",
			header: "Status",
			meta: {
				label: "Status",
				variant: "text",
				placeholder: "Search status...",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<Badge variant="outline">{unitStatusLabel(row.original.status)}</Badge>
			),
		},
		{
			id: "bedrooms",
			accessorKey: "bedrooms",
			header: "Bedrooms",
			meta: {
				label: "Bedrooms",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.bedrooms !== null && row.original.bedrooms !== undefined
						? formatNumber(row.original.bedrooms)
						: "-"}
				</div>
			),
		},
		{
			id: "bathrooms",
			accessorKey: "bathrooms",
			header: "Bathrooms",
			meta: {
				label: "Bathrooms",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.bathrooms !== null &&
					row.original.bathrooms !== undefined
						? formatNumber(row.original.bathrooms)
						: "-"}
				</div>
			),
		},
		{
			id: "rent",
			accessorKey: "rent",
			header: "Rent",
			meta: {
				label: "Monthly Rent",
				variant: "number",
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.rent !== null && row.original.rent !== undefined
						? formatCurrency(row.original.rent)
						: "-"}
				</div>
			),
		},
	];

	const { table } = useClientDataTable({
		data: units,
		columns,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 8,
			},
		},
		// UIX-01: this route also renders TopPropertiesTable — namespace the nuqs URL
		// keys so the two client tables don't share (and clobber) page/sort/filter
		// state.
		queryKeys: {
			page: "unitsPage",
			perPage: "unitsPerPage",
			sort: "unitsSort",
			filters: "unitsFilters",
			joinOperator: "unitsJoin",
		},
	});

	if (!units.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No unit data available
			</div>
		);
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	);
}
