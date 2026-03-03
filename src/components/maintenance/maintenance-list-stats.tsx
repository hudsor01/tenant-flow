'use client'

import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, UserCheck, Download, BarChart3 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface MaintenanceListStatsProps {
	openCount: number
	inProgressCount: number
	completedCount: number
	urgentCount: number
	onCreate?: (() => void) | undefined
}

export function MaintenanceListStats({
	openCount,
	inProgressCount,
	completedCount,
	urgentCount,
	onCreate
}: MaintenanceListStatsProps) {
	return (
		<>
			{/* Stats Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{openCount > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Open</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={openCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting action</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Progress</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={inProgressCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<AlertTriangle />
						</StatIndicator>
						<StatDescription>being worked on</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Completed</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={completedCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{urgentCount > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="hsl(var(--destructive))"
								colorTo="hsl(var(--destructive)/0.3)"
							/>
						)}
						<StatLabel>Urgent</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							<NumberTicker value={urgentCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<Wrench />
						</StatIndicator>
						<StatDescription>
							{urgentCount > 0 ? 'needs attention' : 'all clear'}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Quick Actions */}
			<div className="flex items-center gap-3 mb-6">
				<button
					onClick={onCreate}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Plus className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">New Request</div>
						<div className="text-xs text-muted-foreground">Create ticket</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<UserCheck className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Assign Vendor</div>
						<div className="text-xs text-muted-foreground">Bulk assign</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Download className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Export</div>
						<div className="text-xs text-muted-foreground">Download data</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<BarChart3 className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Analytics</div>
						<div className="text-xs text-muted-foreground">View insights</div>
					</div>
				</button>
			</div>
		</>
	)
}
