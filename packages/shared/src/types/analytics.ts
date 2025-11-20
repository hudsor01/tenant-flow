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

// Re-export from domain-specific analytics modules
export type { OccupancyMetricSummary } from './occupancy-analytics.js'
export type { FinancialMetricSummary } from './financial-analytics.js'
export type {
	PropertyPerformanceEntry,
	PropertyPerformanceEntry as PropertyPerformanceData,
	PropertyPerformanceSummary,
	VisitorAnalyticsResponse
} from './property-analytics.js'
