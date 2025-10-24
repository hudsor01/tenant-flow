'use client'

import { PropertyPerformanceTable } from '@/components/dashboard/property-performance-table'

/**
 * PerformanceSection - Single Responsibility: Display property performance
 *
 * Handles performance section layout - PropertyPerformanceTable manages its own data
 */
export function PerformanceSection() {
	return (
		<div className="rounded-lg border-2 border-border/50 bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
			<div className="border-b border-border/50 bg-linear-to-r from-purple-500/5 to-transparent px-6 py-5">
				<h3 className="text-lg font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
					Property Performance
				</h3>
				<p className="text-sm text-muted-foreground mt-1.5">
					Top performing properties this month
				</p>
			</div>
			<div className="p-6">
				<PropertyPerformanceTable />
			</div>
		</div>
	)
}
