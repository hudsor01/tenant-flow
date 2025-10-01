export interface PropertyPerformanceEntry {
	propertyId: string
	propertyName: string
	occupancyRate: number
	monthlyRevenue: number
	annualRevenue: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	address?: string
	status?: string
	propertyType?: string
}

export interface PropertyPerformanceSummary {
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	averageOccupancy: number
	totalRevenue: number
	bestPerformer?: string
	worstPerformer?: string
}

export interface PropertyUnitDetail {
	propertyId: string
	unitId: string
	unitNumber: string
	status: string
	bedrooms?: number | null
	bathrooms?: number | null
	rent?: number | null
	squareFeet?: number | null
}

export interface UnitStatisticEntry {
	label: string
	value: number
	trend?: number | null
}

export interface VisitorAnalyticsPoint {
	period: string
	visits: number
	inquiries: number
	conversions: number
}

export interface VisitorAnalyticsSummary {
	totalVisits: number
	totalInquiries: number
	totalConversions: number
	conversionRate: number
}

export interface VisitorAnalyticsResponse {
	summary: VisitorAnalyticsSummary
	timeline: VisitorAnalyticsPoint[]
}

export interface PropertyPerformancePageResponse {
	metrics: PropertyPerformanceSummary
	performance: PropertyPerformanceEntry[]
	units: PropertyUnitDetail[]
	unitStats: UnitStatisticEntry[]
	visitorAnalytics: VisitorAnalyticsResponse
}
