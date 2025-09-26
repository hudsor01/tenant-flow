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
	activityColumns: ColumnDef<ActivityRow>[]
}

export function DashboardClient({
	chartData,
	activityData,
	activityColumns
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
