'use client'

import { Home } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { RevenueByUnitType } from '../analytics-types'
import { formatAnalyticsCurrency } from '../analytics-types'

interface RevenueByUnitTypeChartProps {
	data: RevenueByUnitType[]
}

export function RevenueByUnitTypeChart({ data }: RevenueByUnitTypeChartProps) {
	return (
		<BlurFade delay={1.1} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">Revenue by Unit Type</h3>
						<p className="text-sm text-muted-foreground">Income distribution</p>
					</div>
					<Home className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="space-y-4">
					{data.map((type, index) => (
						<BlurFade key={index} delay={1.2 + index * 0.05} inView>
							<div className="flex items-center gap-4">
								<div className="w-24 text-sm font-medium text-foreground">
									{type.type}
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between mb-1">
										<span className="text-xs text-muted-foreground">
											{type.units} units
										</span>
										<span className="text-sm font-medium text-foreground">
											{formatAnalyticsCurrency(type.revenue)}
										</span>
									</div>
									<div className="h-2 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
											style={{ width: `${type.percentage}%` }}
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
