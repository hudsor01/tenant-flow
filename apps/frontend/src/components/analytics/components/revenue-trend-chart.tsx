'use client'

import { BarChart3 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { RevenueTrend } from '../analytics-types'

interface RevenueTrendChartProps {
	data: RevenueTrend[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
	const maxRevenue = Math.max(...data.map(d => d.collected))

	return (
		<BlurFade delay={0.6} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">Revenue Trend</h3>
						<p className="text-sm text-muted-foreground">
							Collected vs projected
						</p>
					</div>
					<BarChart3 className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="h-48 flex items-end gap-3">
					{data.map((item, index) => (
						<BlurFade key={index} delay={0.7 + index * 0.05} inView>
							<div className="flex-1 flex flex-col items-center gap-2">
								<div className="w-full relative">
									{/* Projected (background) */}
									<div
										className="absolute inset-x-0 bottom-0 bg-muted/50 rounded-t"
										style={{
											height: `${(item.projected / maxRevenue) * 160}px`
										}}
									/>
									{/* Collected (foreground) */}
									<div
										className="relative w-full bg-primary rounded-t transition-all hover:bg-primary/80"
										style={{
											height: `${(item.collected / maxRevenue) * 160}px`
										}}
									/>
								</div>
								<span className="text-xs text-muted-foreground">
									{item.month}
								</span>
							</div>
						</BlurFade>
					))}
				</div>

				<div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-sm bg-primary" />
						<span className="text-xs text-muted-foreground">Collected</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-sm bg-muted" />
						<span className="text-xs text-muted-foreground">Projected</span>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
