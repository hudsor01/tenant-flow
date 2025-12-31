'use client'

import { Building2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { PropertyPerformance } from '../analytics-types'
import { formatAnalyticsCurrency } from '../analytics-types'

interface PropertyPerformanceTableProps {
	data: PropertyPerformance[]
	onViewDetails?: () => void
}

export function PropertyPerformanceTable({
	data,
	onViewDetails
}: PropertyPerformanceTableProps) {
	return (
		<BlurFade delay={1.2} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="p-6 border-b border-border">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-foreground">
								Property Performance
							</h3>
							<p className="text-sm text-muted-foreground">
								Comparative metrics across portfolio
							</p>
						</div>
						<button
							onClick={onViewDetails}
							className="text-sm text-primary hover:underline"
						>
							View All
						</button>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
									Property
								</th>
								<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
									Occupancy
								</th>
								<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
									Revenue
								</th>
								<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
									Maintenance
								</th>
								<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
									Rating
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{data.map((property, idx) => (
								<BlurFade key={property.id} delay={1.3 + idx * 0.05} inView>
									<tr className="hover:bg-muted/30 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Building2 className="w-5 h-5 text-primary" />
												</div>
												<span className="font-medium text-foreground">
													{property.name}
												</span>
											</div>
										</td>
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-2">
												<span
													className={`font-medium ${property.occupancy >= 90 ? 'text-emerald-600 dark:text-emerald-400' : property.occupancy >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}
												>
													{property.occupancy}%
												</span>
											</div>
										</td>
										<td className="px-6 py-4 text-right font-medium text-foreground">
											{formatAnalyticsCurrency(property.revenue)}
										</td>
										<td className="px-6 py-4 text-right">
											<span
												className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${property.maintenance === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}
											>
												{property.maintenance}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-1">
												<span className="font-medium text-foreground">
													{property.rating}
												</span>
												<span className="text-amber-500">★</span>
											</div>
										</td>
									</tr>
								</BlurFade>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</BlurFade>
	)
}
