'use client'

import { useState } from 'react'
import {
	FileText,
	DollarSign,
	Building2,
	Wrench,
	Calendar,
	TrendingUp,
	Receipt,
	Users,
	Download,
	Clock,
	Plus,
	Settings,
	Play,
	Pause,
	MoreHorizontal,
	FileSpreadsheet,
	Check,
	Loader2
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '@/components/ui/stat'

interface ReportType {
	id: string
	name: string
	description: string
	icon: string
	category: 'financial' | 'operations'
	formats: ('pdf' | 'csv' | 'xlsx')[]
	frequency: string[]
}

interface RecentReport {
	id: string
	name: string
	type: string
	generatedAt: string
	format: 'pdf' | 'csv' | 'xlsx'
	size: number
	status: 'pending' | 'generating' | 'completed' | 'failed'
}

interface ScheduledReport {
	id: string
	name: string
	type: string
	schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly'
	nextRun: string
	recipients: string[]
	format: 'pdf' | 'csv' | 'xlsx'
	enabled: boolean
}

interface PropertyFilter {
	id: string
	name: string
}

interface DateRangeFilter {
	id: string
	name: string
}

interface ReportsDashboardProps {
	reportTypes: ReportType[]
	recentReports: RecentReport[]
	scheduledReports: ScheduledReport[]
	properties: PropertyFilter[]
	dateRanges: DateRangeFilter[]
	onGenerateReport?: (typeId: string) => void
	onDownloadReport?: (reportId: string) => void
	onDeleteReport?: (reportId: string) => void
	onToggleSchedule?: (scheduleId: string, enabled: boolean) => void
	onEditSchedule?: (scheduleId: string) => void
}

const iconMap: Record<string, React.ReactNode> = {
	DollarSign: <DollarSign className="w-6 h-6" />,
	FileText: <FileText className="w-6 h-6" />,
	Building2: <Building2 className="w-6 h-6" />,
	Wrench: <Wrench className="w-6 h-6" />,
	Calendar: <Calendar className="w-6 h-6" />,
	TrendingUp: <TrendingUp className="w-6 h-6" />,
	Receipt: <Receipt className="w-6 h-6" />,
	Users: <Users className="w-6 h-6" />
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

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

export function ReportsDashboard({
	reportTypes,
	recentReports,
	scheduledReports,
	properties,
	dateRanges,
	onGenerateReport,
	onDownloadReport,
	onDeleteReport,
	onToggleSchedule,
	onEditSchedule
}: ReportsDashboardProps) {
	const [selectedCategory, setSelectedCategory] = useState<
		'all' | 'financial' | 'operations'
	>('all')

	const financialTypes = reportTypes.filter(t => t.category === 'financial')
	const operationsTypes = reportTypes.filter(t => t.category === 'operations')

	const filteredTypes =
		selectedCategory === 'all'
			? reportTypes
			: reportTypes.filter(t => t.category === selectedCategory)

	const totalReports = recentReports.length
	const scheduledCount = scheduledReports.filter(s => s.enabled).length

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

			{/* Stats Row */}
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

			{/* Quick Actions */}
			<div className="flex items-center gap-3 mb-6">
				<button
					onClick={() => onGenerateReport?.('financial-summary')}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<DollarSign className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Financial Summary</div>
						<div className="text-xs text-muted-foreground">Quick generate</div>
					</div>
				</button>
				<button
					onClick={() => onGenerateReport?.('rent-roll')}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<FileText className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Rent Roll</div>
						<div className="text-xs text-muted-foreground">
							Current snapshot
						</div>
					</div>
				</button>
				<button
					onClick={() => onGenerateReport?.('lease-expiry')}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Calendar className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Lease Expiries</div>
						<div className="text-xs text-muted-foreground">Next 90 days</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Download className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Export All</div>
						<div className="text-xs text-muted-foreground">
							Download archive
						</div>
					</div>
				</button>
			</div>

			{/* Category Filter */}
			<BlurFade delay={0.6} inView>
				<div className="flex items-center gap-2 mb-6">
					<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
						{(['all', 'financial', 'operations'] as const).map(cat => (
							<button
								key={cat}
								onClick={() => setSelectedCategory(cat)}
								className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
									selectedCategory === cat
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								{cat === 'all'
									? 'All Reports'
									: cat.charAt(0).toUpperCase() + cat.slice(1)}
							</button>
						))}
					</div>
					<span className="ml-auto text-sm text-muted-foreground">
						{filteredTypes.length}{' '}
						{filteredTypes.length === 1 ? 'template' : 'templates'}
					</span>
				</div>
			</BlurFade>

			{/* Report Type Cards Grid */}
			<BlurFade delay={0.7} inView>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{filteredTypes.map((type, index) => (
						<BlurFade key={type.id} delay={0.8 + index * 0.05} inView>
							<div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all group">
								<div className="flex items-start justify-between mb-4">
									<div
										className={`w-12 h-12 rounded-lg flex items-center justify-center ${
											type.category === 'financial'
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
												: 'bg-primary/10 text-primary'
										}`}
									>
										{iconMap[type.icon] || <FileText className="w-6 h-6" />}
									</div>
									<span
										className={`text-xs px-2 py-1 rounded-full ${
											type.category === 'financial'
												? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
												: 'bg-muted text-muted-foreground'
										}`}
									>
										{type.category}
									</span>
								</div>
								<h3 className="font-medium text-foreground mb-1">
									{type.name}
								</h3>
								<p className="text-sm text-muted-foreground mb-4 line-clamp-2">
									{type.description}
								</p>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1">
										{type.formats.map(fmt => (
											<span
												key={fmt}
												className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground uppercase"
											>
												{fmt}
											</span>
										))}
									</div>
									<button
										onClick={() => onGenerateReport?.(type.id)}
										className="text-sm text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
									>
										Generate
									</button>
								</div>
							</div>
						</BlurFade>
					))}
				</div>
			</BlurFade>

			{/* Recent Reports Table */}
			<BlurFade delay={0.9} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
					<div className="p-6 border-b border-border">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-foreground">Recent Reports</h3>
								<p className="text-sm text-muted-foreground">
									Recently generated reports
								</p>
							</div>
						</div>
					</div>

					<div className="divide-y divide-border">
						{recentReports.map((report, idx) => (
							<BlurFade key={report.id} delay={1 + idx * 0.05} inView>
								<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
									<div className="flex items-center gap-4">
										<div
											className={`w-10 h-10 rounded-lg flex items-center justify-center ${
												report.status === 'completed'
													? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
													: report.status === 'generating'
														? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
														: 'bg-muted text-muted-foreground'
											}`}
										>
											{report.status === 'generating' ? (
												<Loader2 className="w-5 h-5 animate-spin" />
											) : (
												<FileText className="w-5 h-5" />
											)}
										</div>
										<div>
											<p className="font-medium text-foreground">
												{report.name}
											</p>
											<p className="text-sm text-muted-foreground">
												{formatDate(report.generatedAt)} •{' '}
												{formatFileSize(report.size)}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs px-2 py-1 bg-muted rounded uppercase text-muted-foreground">
											{report.format}
										</span>
										{report.status === 'completed' && (
											<button
												onClick={() => onDownloadReport?.(report.id)}
												className="p-2 hover:bg-muted rounded-lg transition-colors"
											>
												<Download className="w-4 h-4 text-muted-foreground" />
											</button>
										)}
										<button className="p-2 hover:bg-muted rounded-lg transition-colors">
											<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
										</button>
									</div>
								</div>
							</BlurFade>
						))}
					</div>
				</div>
			</BlurFade>

			{/* Scheduled Reports */}
			<BlurFade delay={1.1} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="p-6 border-b border-border">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-foreground">
									Scheduled Reports
								</h3>
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
											<p className="font-medium text-foreground">
												{schedule.name}
											</p>
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
		</div>
	)
}
