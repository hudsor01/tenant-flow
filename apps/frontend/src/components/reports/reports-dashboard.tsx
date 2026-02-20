'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { ReportsDashboardProps } from './types'
import { ReportsStatsRow } from './reports-stats-row'
import { ReportsQuickActions } from './reports-quick-actions'
import { ReportsTypeGrid } from './reports-type-grid'
import { ReportsRecentTable } from './reports-recent-table'
import { ReportsScheduledList } from './reports-scheduled-list'

export function ReportsDashboard({
	reportTypes,
	recentReports,
	scheduledReports,
	properties: _properties,
	dateRanges: _dateRanges,
	onGenerateReport,
	onDownloadReport,
	onDeleteReport: _onDeleteReport,
	onToggleSchedule,
	onEditSchedule
}: ReportsDashboardProps) {
	const [selectedCategory, setSelectedCategory] = useState<
		'all' | 'financial' | 'operations'
	>('all')

	const filteredTypes =
		selectedCategory === 'all'
			? reportTypes
			: reportTypes.filter(t => t.category === selectedCategory)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Reports</h1>
						<p className="text-muted-foreground">
							Generate and schedule portfolio reports.
						</p>
					</div>
					<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
						<Plus className="w-4 h-4" />
						Schedule Report
					</button>
				</div>
			</BlurFade>

			<ReportsStatsRow
				reportTypes={reportTypes}
				recentReports={recentReports}
				scheduledReports={scheduledReports}
			/>

			<ReportsQuickActions onGenerateReport={onGenerateReport} />

			<ReportsTypeGrid
				filteredTypes={filteredTypes}
				selectedCategory={selectedCategory}
				onCategoryChange={setSelectedCategory}
				onGenerateReport={onGenerateReport}
			/>

			<ReportsRecentTable
				recentReports={recentReports}
				onDownloadReport={onDownloadReport}
			/>

			<ReportsScheduledList
				scheduledReports={scheduledReports}
				onToggleSchedule={onToggleSchedule}
				onEditSchedule={onEditSchedule}
			/>
		</div>
	)
}
