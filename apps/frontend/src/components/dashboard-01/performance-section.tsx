'use client'

import { PropertyPerformanceTable } from '@/components/dashboard-01/property-performance-table'

/**
 * PerformanceSection - Single Responsibility: Display property performance
 *
 * Handles performance section layout - PropertyPerformanceTable manages its own data
 */
export function PerformanceSection() {
	return (
		<div className="rounded-lg border bg-card">
			<div className="border-b px-6 py-4">
				<h3 className="text-lg font-semibold">Property Performance</h3>
				<p className="text-sm text-muted-foreground">Top performing properties this month</p>
			</div>
			<div className="p-6">
				<PropertyPerformanceTable />
			</div>
		</div>
	)
}