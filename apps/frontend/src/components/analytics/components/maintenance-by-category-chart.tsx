'use client'

import { PieChart } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { MaintenanceCategory } from '../analytics-types'

interface MaintenanceByCategoryChartProps {
	data: MaintenanceCategory[]
}

export function MaintenanceByCategoryChart({
	data
}: MaintenanceByCategoryChartProps) {
	return (
		<BlurFade delay={1} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">
							Maintenance by Category
						</h3>
						<p className="text-sm text-muted-foreground">Request distribution</p>
					</div>
					<PieChart className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="space-y-4">
					{data.map((cat, index) => (
						<BlurFade key={index} delay={1.1 + index * 0.05} inView>
							<div className="flex items-center gap-4">
								<div className="w-10 text-sm font-medium text-muted-foreground">
									{cat.percentage}%
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between mb-1">
										<span className="text-sm font-medium text-foreground">
											{cat.category}
										</span>
										<span className="text-xs text-muted-foreground">
											{cat.count} requests
										</span>
									</div>
									<div className="h-2 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-primary rounded-full transition-all duration-1000"
											style={{ width: `${cat.percentage}%` }}
										/>
									</div>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
