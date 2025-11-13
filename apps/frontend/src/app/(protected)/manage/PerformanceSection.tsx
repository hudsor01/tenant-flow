'use client'

import { PropertyPerformanceTable } from '#components/dashboard/property-performance-table'

/**
 * PerformanceSection - Single Responsibility: Display property performance
 *
 * Handles performance section layout - PropertyPerformanceTable manages its own data
 */
export function PerformanceSection() {
	return (
		<section className="dashboard-panel">
			<div className="dashboard-panel-header" data-variant="performance">
				<h3 className="dashboard-panel-title">Property Performance</h3>
				<p className="dashboard-panel-description">
					Top performing properties this month
				</p>
			</div>
			<div className="dashboard-panel-body">
				<PropertyPerformanceTable />
			</div>
		</section>
	)
}
