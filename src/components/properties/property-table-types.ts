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
	{ id: "revenue", label: "Occupied Rent", defaultVisible: true },
];

/**
 * Per-column layout classes shared by the flex `<thead>` cells and the flex
 * virtualized row `<td>`s so column widths stay in lockstep and align. Each entry
 * is `display` + width + vertical centering; responsive columns (address, revenue)
 * carry their own `hidden md:flex` / `hidden lg:flex` so the header cell and the
 * row cell drop together at every breakpoint. Conditional visibility is handled
 * separately via `isColumnVisible`, which omits both cells entirely.
 */
/**
 * Each column's box, header and body alike (the virtualized table is flex rows,
 * so one class per column keeps them aligned). The property column had no
 * floor, so the three flexible columns shared what the fixed ones left: 8.94 px
 * of name at 1280 and 6.11 px at 390. It now keeps a floor (14 rem below lg,
 * where the table scrolls in its box anyway; 10 rem from lg, so at 1280 the
 * row fits its 876 px box) and takes the remaining width; the status column is
 * sized to its badges; the address
 * column shows from 2xl, where the row has room for it (the property page
 * gives the address); and the table is at least its columns' floors wide
 * (min-w-min), so below that its own scroll box scrolls, never the page.
 */
export const PROPERTY_COLUMN_CLASS = {
	checkbox: "flex w-12 shrink-0 items-center",
	property: "flex flex-1 min-w-56 lg:min-w-40 items-center",
	address: "hidden 2xl:flex flex-1 min-w-48 items-center",
	units: "flex w-20 shrink-0 items-center",
	occupancy: "flex w-36 shrink-0 items-center",
	status: "flex w-32 shrink-0 items-center",
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
