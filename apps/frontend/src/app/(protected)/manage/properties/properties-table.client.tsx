'use client'

import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import type { Property } from '@repo/shared/types/core'

interface PropertiesTableClientProps {
	columns: ColumnDef<Property>[]
	data: Property[]
}

export function PropertiesTableClient({ columns, data }: PropertiesTableClientProps) {
	return (
		<DataTable
			columns={columns}
			data={data}
			filterColumn="name"
			filterPlaceholder="Filter by property name..."
		/>
	)
}
