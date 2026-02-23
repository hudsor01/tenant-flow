'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { LeaseStatus } from '@repo/shared/types/core'

// ============================================================================
// TYPES (shared between helper components)
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null
export type SortField = 'fullName' | 'email' | 'property' | 'leaseStatus' | null

// ============================================================================
// STATUS SELECT CELL
// ============================================================================

export function StatusSelectCell({
	value,
	onChange
}: {
	value: LeaseStatus | undefined
	onChange: (value: LeaseStatus) => void
}) {
	const statusLabels: Record<LeaseStatus, string> = {
		draft: 'Draft',
		pending_signature: 'Pending',
		active: 'Active',
		ended: 'Ended',
		terminated: 'Terminated'
	}

	return (
		<Select
			value={value || 'active'}
			onValueChange={v => onChange(v as LeaseStatus)}
		>
			<SelectTrigger className="h-8 w-[100px] text-sm">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{Object.entries(statusLabels).map(([key, label]) => (
					<SelectItem key={key} value={key}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

// ============================================================================
// SORTABLE COLUMN HEADER
// ============================================================================

export function SortableHeader({
	title,
	field,
	currentSort,
	currentDirection,
	onSort
}: {
	title: string
	field: SortField
	currentSort: SortField
	currentDirection: SortDirection
	onSort: (field: SortField) => void
}) {
	const isActive = currentSort === field

	return (
		<button
			onClick={() => onSort(field)}
			className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
		>
			{title}
			{isActive ? (
				currentDirection === 'asc' ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)
			) : (
				<ChevronsUpDown className="h-4 w-4 opacity-50" />
			)}
		</button>
	)
}
