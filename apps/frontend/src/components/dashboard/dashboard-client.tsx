'use client'

import { ChartArea } from '@/components/dashboard/chart-area'
import { DataTable } from '@/components/dashboard/data-table'
import type { ColumnDef } from '@tanstack/react-table'

interface ActivityRow {
	type: string
	action: string
	details: string
	timestamp: string
}

interface DashboardClientProps {
	chartData: Array<{
		date: string
		revenue: number
		expenses: number
	}>
	activityData: ActivityRow[]
}

// Column definitions for the activity table - moved to Client Component
const activityColumns: ColumnDef<ActivityRow>[] = [
	{
		accessorKey: 'type',
		header: 'Type',
		cell: ({ row }) => (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-2)'
				}}
			>
				<span
					style={{
						display: 'inline-block',
						width: '8px',
						height: '8px',
						borderRadius: '50%',
						background:
							row.original.type === 'Property'
								? 'var(--color-system-blue)'
								: row.original.type === 'Tenant'
									? 'var(--color-system-green)'
									: row.original.type === 'Lease'
										? 'var(--color-system-yellow)'
										: 'var(--color-system-orange)'
					}}
				/>
				<span>{row.original.type}</span>
			</div>
		)
	},
	{
		accessorKey: 'action',
		header: 'Action'
	},
	{
		accessorKey: 'details',
		header: 'Details',
		cell: ({ row }) => (
			<span
				style={{
					fontSize: 'var(--font-caption-1)',
					color: 'var(--color-label-secondary)'
				}}
			>
				{row.original.details}
			</span>
		)
	},
	{
		accessorKey: 'timestamp',
		header: 'Time',
		cell: ({ row }) => (
			<span
				style={{
					fontSize: 'var(--font-caption-1)',
					color: 'var(--color-label-tertiary)'
				}}
			>
				{row.original.timestamp
					? new Date(row.original.timestamp).toISOString().slice(11, 16)
					: '--:--'}
			</span>
		)
	}
]

export function DashboardClient({
	chartData,
	activityData
}: DashboardClientProps) {
	return (
		<>
			{/* Chart Section */}
			<div style={{ width: '100%' }}>
				<ChartArea
					data={chartData}
					title="Revenue & Expenses"
					description="Monthly revenue and expenses overview"
				/>
			</div>

			{/* Activity Table */}
			<div style={{ width: '100%' }}>
				<DataTable<ActivityRow, unknown>
					columns={activityColumns}
					data={activityData}
					title="Recent Activity"
					description="Latest updates across your properties"
				/>
			</div>
		</>
	)
}
