'use client'

import { TrendingUp } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { OccupancyTrend } from '../analytics-types'

interface OccupancyTrendChartProps {
	data: OccupancyTrend[]
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
	return (
		<BlurFade delay={0.7} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">Occupancy Trend</h3>
						<p className="text-sm text-muted-foreground">
							Portfolio occupancy rate
						</p>
					</div>
					<TrendingUp className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="h-48 flex items-end gap-3">
					{data.map((item, index) => (
						<BlurFade key={index} delay={0.8 + index * 0.05} inView>
							<div className="flex-1 flex flex-col items-center gap-2">
								<div
									className="w-full bg-emerald-500/20 rounded-t transition-all hover:bg-emerald-500/30 relative"
									style={{ height: `${(item.rate / 100) * 160}px` }}
								>
									<div
										className="absolute inset-x-0 bottom-0 bg-emerald-500 rounded-t"
										style={{ height: '100%' }}
									/>
									<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground">
										{item.rate}%
									</span>
								</div>
								<span className="text-xs text-muted-foreground">
									{item.month}
								</span>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
