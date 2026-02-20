import type { PropertyItem } from './types'

export type SortField = 'name' | 'address' | 'units' | 'occupancy' | 'revenue'
export type SortDirection = 'asc' | 'desc'
export type ColumnId =
	| 'property'
	| 'address'
	| 'units'
	| 'occupancy'
	| 'revenue'
	| 'status'

export interface ColumnConfig {
	id: ColumnId
	label: string
	alwaysVisible?: boolean
	defaultVisible?: boolean
}

export const TABLE_COLUMNS: ColumnConfig[] = [
	{ id: 'property', label: 'Property', alwaysVisible: true },
	{ id: 'address', label: 'Address', defaultVisible: true },
	{ id: 'units', label: 'Units', defaultVisible: true },
	{ id: 'occupancy', label: 'Occupancy', defaultVisible: true },
	{ id: 'status', label: 'Status', defaultVisible: true },
	{ id: 'revenue', label: 'Monthly Revenue', defaultVisible: true }
]

export interface PropertyTableProps {
	properties: PropertyItem[]
	selectedRows: Set<string>
	onSelectRow: (id: string) => void
	onSelectAll: () => void
	onView: ((id: string) => void) | undefined
	onEdit: ((id: string) => void) | undefined
	onDelete: ((id: string) => void) | undefined
}

export function formatCurrency(amountInCents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amountInCents / 100)
}

export function formatPropertyType(type: string): string {
	return type
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
