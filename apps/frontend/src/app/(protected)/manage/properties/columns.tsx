"use client"

import { ColumnDef } from '@tanstack/react-table'
import type { Property } from '@repo/shared/types/core'
import {
	createTextColumn,
	createAddressColumn,
	createBadgeColumn,
	createStatusColumn,
	createActionsColumn
} from '@/lib/table-columns'

export const columns: ColumnDef<Property>[] = [
	createTextColumn<Property>(
		'name',
		'Property Name',
		true,
		row => `/manage/properties/${row.id}`
	),
	createAddressColumn<Property>(),
	createBadgeColumn<Property>('propertyType', 'Type'),
	createStatusColumn<Property>(),
	createActionsColumn<Property>(row => [
		{ label: 'View details', href: `/manage/properties/${row.id}` },
		{ label: 'Edit property', href: `/manage/properties/${row.id}/edit` }
	])
]
