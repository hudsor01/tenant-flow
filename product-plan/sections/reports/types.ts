export interface ReportType {
	id: string
	name: string
	description: string
	icon: string
	category: 'financial' | 'operations'
	formats: ('pdf' | 'csv' | 'xlsx')[]
	frequency: string[]
}

export interface RecentReport {
	id: string
	name: string
	type: string
	generatedAt: string
	format: 'pdf' | 'csv' | 'xlsx'
	size: number
	status: 'pending' | 'generating' | 'completed' | 'failed'
}

export interface ScheduledReport {
	id: string
	name: string
	type: string
	schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly'
	nextRun: string
	recipients: string[]
	format: 'pdf' | 'csv' | 'xlsx'
	enabled: boolean
}

export interface PropertyFilter {
	id: string
	name: string
}

export interface DateRangeFilter {
	id: string
	name: string
}

export interface ReportsDashboardProps {
	reportTypes: ReportType[]
	recentReports: RecentReport[]
	scheduledReports: ScheduledReport[]
	properties: PropertyFilter[]
	dateRanges: DateRangeFilter[]
	onGenerateReport?: (typeId: string, options: ReportGenerationOptions) => void
	onDownloadReport?: (reportId: string) => void
	onDeleteReport?: (reportId: string) => void
	onToggleSchedule?: (scheduleId: string, enabled: boolean) => void
	onEditSchedule?: (scheduleId: string) => void
}

export interface ReportGenerationOptions {
	propertyId: string
	dateRange: string
	format: 'pdf' | 'csv' | 'xlsx'
	customStartDate?: string
	customEndDate?: string
}
