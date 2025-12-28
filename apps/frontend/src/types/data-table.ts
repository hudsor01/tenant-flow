import type { ColumnSort, Row, RowData } from '@tanstack/react-table'
import type { DataTableConfig } from '#config/data-table'
import type { FilterItemSchema } from '#lib/parsers'

declare module '@tanstack/react-table' {
	interface TableMeta<TData extends RowData> {
		queryKeys?: QueryKeys
		// Phantom field to satisfy linter - this type is required by module augmentation
		_phantom?: TData
	}

	interface ColumnMeta<TData extends RowData, TValue> {
		// Phantom fields to satisfy linter - these types are required by module augmentation
		_phantom?: [TData, TValue]
		label?: string
		placeholder?: string
		variant?: FilterVariant
		options?: Option[]
		range?: [number, number]
		unit?: string
		icon?: React.FC<React.SVGProps<SVGSVGElement>>
	}
}

export interface QueryKeys {
	page: string
	perPage: string
	sort: string
	filters: string
	joinOperator: string
}

export interface Option {
	label: string
	value: string
	count?: number
	icon?: React.FC<React.SVGProps<SVGSVGElement>>
}

export type FilterOperator = DataTableConfig['operators'][number]
export type FilterVariant = DataTableConfig['filterVariants'][number]
export type JoinOperator = DataTableConfig['joinOperators'][number]

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, 'id'> {
	id: Extract<keyof TData, string>
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
	id: Extract<keyof TData, string>
}

export interface DataTableRowAction<TData> {
	row: Row<TData>
	variant: 'update' | 'delete'
}
