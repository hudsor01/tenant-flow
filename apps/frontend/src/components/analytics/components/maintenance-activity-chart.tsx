'use client'

import { Wrench } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { MaintenanceTrend } from '../analytics-types'

interface MaintenanceActivityChartProps {
	data: MaintenanceTrend[]
}

export function MaintenanceActivityChart({
	data
}: MaintenanceActivityChartProps) {
	const maxMaintenance = Math.max(
		...data.map(d => Math.max(d.opened, d.completed))
	)

	return (
		<BlurFade delay={0.8} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="font-medium text-foreground">Maintenance Activity</h3>
						<p className="text-sm text-muted-foreground">
							Opened vs completed requests
						</p>
					</div>
					<Wrench className="w-5 h-5 text-muted-foreground" />
				</div>

				<div className="h-40 flex items-end gap-4">
					{data.map((item, index) => (
						<BlurFade key={index} delay={0.9 + index * 0.05} inView>
							<div className="flex-1 flex flex-col items-center gap-2">
								<div className="w-full flex gap-1">
									<div
										className="flex-1 bg-amber-500 rounded-t transition-all hover:bg-amber-500/80"
										style={{
											height: `${(item.opened / maxMaintenance) * 120}px`
										}}
									/>
									<div
										className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-500/80"
										style={{
											height: `${(item.completed / maxMaintenance) * 120}px`
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
						<div className="w-3 h-3 rounded-sm bg-amber-500" />
						<span className="text-xs text-muted-foreground">Opened</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-sm bg-emerald-500" />
						<span className="text-xs text-muted-foreground">Completed</span>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
