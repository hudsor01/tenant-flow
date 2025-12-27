/**
 * Analytics Types - Common interfaces for analytics across all domains
 * Consolidates shared analytics patterns used by property, occupancy, financial, and other analytics modules
 */

// Base analytics data point
export interface AnalyticsDataPoint {
	label: string
	value: number
	timestamp?: string
	metadata?: Record<string, unknown>
}

// Time-series analytics
export interface TimeSeriesDataPoint {
	date: string
	value: number
	label?: string
}

// Analytics trend indicator
export interface MetricTrend {
	current: number
	previous: number | null
	change: number // Absolute change
	percentChange: number // Percentage change
}

// Common analytics metric summary
export interface MetricSummary {
	label: string
	value: number
	trend?: MetricTrend
	comparison?: {
		period: string
		percentChange: number
	}
}

// Common analytics breakdown row
export interface AnalyticsBreakdownRow {
	label: string
	value: number
	percentage?: number | null
	change?: number | null
	trend?: 'up' | 'down' | 'stable'
}

// Analytics response with breakdown
export interface AnalyticsBreakdown {
	items: AnalyticsBreakdownRow[]
	total: number
	summary?: MetricSummary
}

// Analytics time-series response
export interface TimeSeriesResponse {
	dataPoints: TimeSeriesDataPoint[]
	summary: {
		min: number
		max: number
		average: number
		total: number
	}
	period: {
		start: string
		end: string
	}
}

// Analytics pagination response
export interface AnalyticsPaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	pageSize: number
	hasMore: boolean
}

// Analytics chart data structure
export interface ChartDataPoint {
	x: string | number
	y: number
	label?: string
	metadata?: Record<string, unknown>
}

// Analytics event/activity
export interface AnalyticsEvent {
	eventType: string
	entityType: string
	entityId: string
	userId?: string
	timestamp: string
	metadata?: Record<string, unknown>
}

// Analytics filter options
export interface AnalyticsFilterOptions {
	dateFrom?: string
	dateTo?: string
	period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
	limit?: number
	offset?: number
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
}

// Analytics aggregation options
export interface AggregationOptions {
	granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
	metric: string
	groupBy?: string
}

// Common analytics page response structure
export interface AnalyticsPageResponse<T extends Record<string, unknown>> {
	metrics: T
	timestamp: string
	period?: {
		start: string
		end: string
	}
}

// Comparison metrics
export interface ComparisonMetric {
	current: number
	previous: number
	change: number
	percentChange: number
	trend: 'up' | 'down' | 'stable'
}

// Analytics summary snapshot
export interface AnalyticsSummary {
	totalCount: number
	activeCount: number
	inactiveCount: number
	changePercent: number
	trend: 'up' | 'down' | 'stable'
}

// =============================================================================
// FINANCIAL ANALYTICS (merged from financial-analytics.ts)
// =============================================================================

export interface FinancialMetricSummary {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	cashFlow: number
	revenueTrend?: number | null
	expenseTrend?: number | null
	profitMargin?: number | null
}

export interface FinancialBreakdownRow {
	label: string
	value: number
	percentage?: number | null
	change?: number | null
}

export interface RevenueExpenseBreakdown {
	revenue: FinancialBreakdownRow[]
	expenses: FinancialBreakdownRow[]
	totals: {
		revenue: number
		expenses: number
		netIncome: number
	}
}

export interface NetOperatingIncomeByProperty {
	property_id: string
	propertyName: string
	noi: number
	revenue: number
	expenses: number
	margin: number
}

export interface FinancialOverviewSnapshot {
	overview: {
		totalRevenue: number
		totalExpenses: number
		netIncome: number
		accountsReceivable: number
		accountsPayable: number
	}
	highlights: Array<{
		label: string
		value: number
		trend?: number | null
	}>
}

export interface BillingInsightsTimelinePoint {
	period: string
	invoiced: number
	paid: number
	overdue: number
}

export interface BillingInsightsTimeline {
	points: BillingInsightsTimelinePoint[]
	totals: {
		invoiced: number
		paid: number
		overdue: number
	}
}

export interface ExpenseCategorySummary {
	category: string
	amount: number
	percentage: number
}

export interface ExpenseSummaryResponse {
	categories: ExpenseCategorySummary[]
	monthlyTotals: Array<{
		month: string
		amount: number
	}>
	totals: {
		amount: number
		monthlyAverage: number
		yearOverYearChange?: number | null
	}
}

export interface InvoiceStatusSummary {
	status: string
	count: number
	amount: number
}

export interface MonthlyFinancialMetric {
	month: string
	revenue: number
	expenses: number
	netIncome: number
	cashFlow: number
}

export interface LeaseFinancialSummary {
	totalLeases: number
	activeLeases: number
	expiringSoon: number
	totalrent_amount: number
	averageLeaseValue: number
}

export interface LeaseFinancialInsight {
	lease_id: string
	propertyName: string
	tenantName: string
	rent_amount: number
	outstandingBalance: number
	profitabilityScore?: number | null
}

export interface FinancialAnalyticsPageResponse {
	metrics: FinancialMetricSummary
	breakdown: RevenueExpenseBreakdown
	netOperatingIncome: NetOperatingIncomeByProperty[]
	financialOverview: FinancialOverviewSnapshot
	billingInsights: BillingInsightsTimeline
	expenseSummary: ExpenseSummaryResponse
	invoiceSummary: InvoiceStatusSummary[]
	monthlyMetrics: MonthlyFinancialMetric[]
	leaseSummary: LeaseFinancialSummary
	leaseAnalytics: LeaseFinancialInsight[]
}

// =============================================================================
// LEASE ANALYTICS (merged from lease-analytics.ts)
// =============================================================================

export interface LeaseLifecyclePoint {
	period: string
	renewals: number
	expirations: number
	noticesGiven: number
}

export interface LeaseStatusBreakdown {
	status: string
	count: number
	percentage: number
}

export interface LeaseAnalyticsPageResponse {
	metrics: LeaseFinancialSummary
	profitability: LeaseFinancialInsight[]
	lifecycle: LeaseLifecyclePoint[]
	statusBreakdown: LeaseStatusBreakdown[]
}

// =============================================================================
// MAINTENANCE ANALYTICS (merged from maintenance-analytics.ts)
// =============================================================================

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

// =============================================================================
// OCCUPANCY ANALYTICS (merged from occupancy-analytics.ts)
// =============================================================================

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

// =============================================================================
// PROPERTY ANALYTICS (merged from property-analytics.ts)
// =============================================================================

export interface PropertyPerformanceEntry {
	property_id: string
	propertyName: string
	occupancyRate: number
	monthlyRevenue: number
	annualRevenue: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	address?: string
	status?: string
	property_type?: string
	trend: 'up' | 'down' | 'stable'
	trendPercentage: number
}

// Alias for backwards compatibility
export type PropertyPerformanceData = PropertyPerformanceEntry

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
	property_id: string
	unit_id: string
	unit_number: string
	status: string
	bedrooms?: number | null
	bathrooms?: number | null
	rent?: number | null
	square_feet?: number | null
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
