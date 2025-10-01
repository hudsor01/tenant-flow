export interface MaintenanceMetricSummary {
	openRequests: number
	inProgressRequests: number
	completedRequests: number
	averageResponseTimeHours: number
	totalCost: number
}

export interface MaintenanceCostBreakdownEntry {
	category: string
	amount: number
	percentage: number
}

export interface MaintenanceTrendPoint {
	period: string
	completed: number
	pending: number
	avgResolutionTime: number
}

export interface MaintenanceCategoryBreakdown {
	category: string
	count: number
}

export interface MaintenanceAnalyticsPageResponse {
	metrics: MaintenanceMetricSummary
	costBreakdown: MaintenanceCostBreakdownEntry[]
	trends: MaintenanceTrendPoint[]
	categoryBreakdown: MaintenanceCategoryBreakdown[]
}
