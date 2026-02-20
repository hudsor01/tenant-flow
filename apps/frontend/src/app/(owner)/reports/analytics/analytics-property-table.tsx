'use client'

import { Card } from '#components/ui/card'
import type { OccupancyMetrics } from '@repo/shared/types/reports'

const formatPercent = (value: number) => `${value.toFixed(1)}%`

interface AnalyticsPropertyTableProps {
	occupancyMetrics: OccupancyMetrics
}

export function AnalyticsPropertyTable({
	occupancyMetrics
}: AnalyticsPropertyTableProps) {
	return (
		<Card className="@container/card">
			<div className="p-6 border-b">
				<h2 className="typography-h4">Property Details</h2>
				<p className="text-muted-foreground text-sm">
					Individual property performance metrics
				</p>
			</div>
			<div className="p-6">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b">
								<th className="text-left font-semibold p-3">Property Name</th>
								<th className="text-left font-semibold p-3">Total Units</th>
								<th className="text-left font-semibold p-3">Occupied Units</th>
								<th className="text-left font-semibold p-3">Occupancy Rate</th>
							</tr>
						</thead>
						<tbody>
							{occupancyMetrics.byProperty.map(property => (
								<tr
									key={property.propertyName}
									className="border-b hover:bg-muted/30 transition-colors"
								>
									<td className="p-3 font-medium">{property.propertyName}</td>
									<td className="p-3 text-muted-foreground">
										{property.totalUnits}
									</td>
									<td className="p-3 text-muted-foreground">
										{property.occupiedUnits}
									</td>
									<td className="p-3">
										<div className="flex items-center gap-2">
											<div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
												<div
													className="h-full bg-chart-4 transition-all"
													style={{ width: `${property.occupancyRate}%` }}
												/>
											</div>
											<span className="typography-small w-12 text-right">
												{formatPercent(property.occupancyRate)}
											</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</Card>
	)
}
