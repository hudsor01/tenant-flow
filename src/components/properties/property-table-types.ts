import type { PropertyItem } from "./types";

export type SortField = "name" | "address" | "units" | "occupancy" | "revenue";
export type SortDirection = "asc" | "desc";
export type ColumnId =
	| "property"
	| "address"
	| "units"
	| "occupancy"
	| "revenue"
	| "status";

export interface ColumnConfig {
	id: ColumnId;
	label: string;
	alwaysVisible?: boolean;
	defaultVisible?: boolean;
}

export const TABLE_COLUMNS: ColumnConfig[] = [
	{ id: "property", label: "Property", alwaysVisible: true },
	{ id: "address", label: "Address", defaultVisible: true },
	{ id: "units", label: "Units", defaultVisible: true },
	{ id: "occupancy", label: "Occupancy", defaultVisible: true },
	{ id: "status", label: "Status", defaultVisible: true },
	{ id: "revenue", label: "Monthly Revenue", defaultVisible: true },
];

/**
 * Per-column layout classes shared by the flex `<thead>` cells and the flex
 * virtualized row `<td>`s so column widths stay in lockstep and align. Each entry
 * is `display` + width + vertical centering; responsive columns (address, revenue)
 * carry their own `hidden md:flex` / `hidden lg:flex` so the header cell and the
 * row cell drop together at every breakpoint. Conditional visibility is handled
 * separately via `isColumnVisible`, which omits both cells entirely.
 */
export const PROPERTY_COLUMN_CLASS = {
	checkbox: "flex w-12 shrink-0 items-center",
	property: "flex flex-1 min-w-0 items-center",
	address: "hidden md:flex flex-1 min-w-0 items-center",
	units: "flex w-24 shrink-0 items-center",
	occupancy: "flex w-44 shrink-0 items-center",
	status: "flex flex-1 min-w-0 items-center",
	revenue: "hidden lg:flex w-40 shrink-0 items-center",
	actions: "flex w-36 shrink-0 items-center justify-end",
} as const;

export interface PropertyTableProps {
	properties: PropertyItem[];
	selectedRows: Set<string>;
	onSelectRow: (id: string) => void;
	onSelectAll: () => void;
	onView: ((id: string) => void) | undefined;
	onEdit: ((id: string) => void) | undefined;
	onDelete: ((id: string) => void) | undefined;
}

export function formatPropertyType(type: string): string {
	return type
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
