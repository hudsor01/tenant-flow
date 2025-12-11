'use client'

import { PropertyPerformanceTable } from '#components/dashboard/property-performance-table'
import { DashboardSection } from '#components/dashboard/dashboard-section'

/**
 * PerformanceSection - Display property performance
 *
 * Uses DashboardSection for consistent layout - PropertyPerformanceTable manages its own data
 */
export function PerformanceSection() {
	return (
		<DashboardSection
			title="Property Performance"
			description="Top performing properties this month"
			variant="performance"
		>
			<PropertyPerformanceTable />
		</DashboardSection>
	)
}
