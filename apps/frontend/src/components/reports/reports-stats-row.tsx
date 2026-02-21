'use client'

import { DollarSign, Clock, FileSpreadsheet, Check } from 'lucide-react'
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
import type { ReportType, RecentReport, ScheduledReport } from './types'

interface ReportsStatsRowProps {
	reportTypes: ReportType[]
	recentReports: RecentReport[]
	scheduledReports: ScheduledReport[]
}

export function ReportsStatsRow({
	reportTypes,
	recentReports,
	scheduledReports
}: ReportsStatsRowProps) {
	const financialTypes = reportTypes.filter(t => t.category === 'financial')
	const totalReports = recentReports.length
	const scheduledCount = scheduledReports.filter(s => s.enabled).length

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary)/0.3)"
					/>
					<StatLabel>Report Types</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={reportTypes.length} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<FileSpreadsheet />
					</StatIndicator>
					<StatDescription>available templates</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Generated This Month</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={totalReports} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Check />
					</StatIndicator>
					<StatDescription>reports created</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Scheduled Reports</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						<NumberTicker value={scheduledCount} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Clock />
					</StatIndicator>
					<StatDescription>active schedules</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Financial Reports</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={financialTypes.length} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<DollarSign />
					</StatIndicator>
					<StatDescription>financial templates</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
