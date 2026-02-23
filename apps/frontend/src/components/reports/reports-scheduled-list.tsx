'use client'

import { Clock, Pause, Play, Settings } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { ScheduledReport } from './types'

function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = date.getTime() - now.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Tomorrow'
	if (diffDays < 7) return `In ${diffDays} days`
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ReportsScheduledListProps {
	scheduledReports: ScheduledReport[]
	onToggleSchedule: ((scheduleId: string, enabled: boolean) => void) | undefined
	onEditSchedule: ((scheduleId: string) => void) | undefined
}

export function ReportsScheduledList({
	scheduledReports,
	onToggleSchedule,
	onEditSchedule
}: ReportsScheduledListProps) {
	return (
		<BlurFade delay={1.1} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="p-6 border-b border-border">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-foreground">Scheduled Reports</h3>
							<p className="text-sm text-muted-foreground">
								Automated recurring reports
							</p>
						</div>
						<button className="text-sm text-primary hover:underline">
							+ Add Schedule
						</button>
					</div>
				</div>

				<div className="divide-y divide-border">
					{scheduledReports.map((schedule, idx) => (
						<BlurFade key={schedule.id} delay={1.2 + idx * 0.05} inView>
							<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
								<div className="flex items-center gap-4">
									<div
										className={`w-10 h-10 rounded-lg flex items-center justify-center ${
											schedule.enabled
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
												: 'bg-muted text-muted-foreground'
										}`}
									>
										<Clock className="w-5 h-5" />
									</div>
									<div>
										<p className="font-medium text-foreground">{schedule.name}</p>
										<p className="text-sm text-muted-foreground">
											{schedule.schedule.charAt(0).toUpperCase() +
												schedule.schedule.slice(1)}{' '}
											• Next: {formatRelativeDate(schedule.nextRun)}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs px-2 py-1 bg-muted rounded uppercase text-muted-foreground">
										{schedule.format}
									</span>
									<button
										onClick={() =>
											onToggleSchedule?.(schedule.id, !schedule.enabled)
										}
										className={`p-2 rounded-lg transition-colors ${
											schedule.enabled
												? 'bg-emerald-100 dark:bg-emerald-900/30'
												: 'bg-muted'
										}`}
									>
										{schedule.enabled ? (
											<Pause className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
										) : (
											<Play className="w-4 h-4 text-muted-foreground" />
										)}
									</button>
									<button
										onClick={() => onEditSchedule?.(schedule.id)}
										className="p-2 hover:bg-muted rounded-lg transition-colors"
									>
										<Settings className="w-4 h-4 text-muted-foreground" />
									</button>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
