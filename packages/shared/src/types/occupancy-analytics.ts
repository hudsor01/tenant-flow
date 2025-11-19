export interface OccupancyMetricSummary {
	currentOccupancy: number
	averageVacancyDays: number
	seasonalPeakOccupancy: number
	trend: number
}

export interface OccupancyTrendPoint {
	period: string
	occupancyRate: number
	occupiedUnits: number
	totalUnits: number
}

export interface VacancyAnalysisEntry {
	property_id: string
	propertyName: string
	vacancyDays: number
	turnovers: number
	notes?: string
}

export interface OccupancyAnalyticsPageResponse {
	metrics: OccupancyMetricSummary
	trends: OccupancyTrendPoint[]
	vacancyAnalysis: VacancyAnalysisEntry[]
}
