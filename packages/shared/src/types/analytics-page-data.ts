/**
 * Analytics Page Data Types
 * Types for aggregated analytics page data functions
 * Used by analytics-page.ts to provide unified page data loading
 */

import type { FinancialAnalyticsPageResponse } from './financial-analytics'
import type { LeaseAnalyticsPageResponse, LeaseLifecyclePoint } from './lease-analytics'
import type { MaintenanceAnalyticsPageResponse, MaintenanceTrendPoint as MAMaintenanceTrendPoint } from './maintenance-analytics'
import type { OccupancyAnalyticsPageResponse } from './occupancy-analytics'
import type {
	PropertyPerformancePageResponse,
	VisitorAnalyticsResponse
} from './property-analytics'

// ============================================================================
// Response Time Analytics Types
// ============================================================================

export interface ResponseTimeEntry {
	category: string
	averageHours: number
	minHours: number
	maxHours: number
	count: number
}

export interface PreventiveMaintenanceEntry {
	type: string
	scheduledCount: number
	completedCount: number
	complianceRate: number
}

// ============================================================================
// Property Performance Analytics Types
// ============================================================================

export interface PropertyPerformanceEntry {
	property_id: string
	propertyName: string
	occupancyRate: number
	revenue: number
	expenses: number
	netIncome: number
	maintenanceScore: number
}

export interface SeasonalPatternEntry {
	month: string
	occupancyRate: number
	turnoverRate: number
	avgRentChange: number
}

// ============================================================================
// Financial Analytics Page Data
// ============================================================================

/**
 * Financial Analytics Page Data
 * Aggregates all financial analytics data for the financial analytics page
 */
export interface FinancialAnalyticsPageData {
	metrics: FinancialAnalyticsPageResponse['metrics']
	breakdown: FinancialAnalyticsPageResponse['breakdown']
	netOperatingIncome: FinancialAnalyticsPageResponse['netOperatingIncome']
	billingInsights: FinancialAnalyticsPageResponse['billingInsights']
	invoiceSummary: FinancialAnalyticsPageResponse['invoiceSummary']
	monthlyMetrics: FinancialAnalyticsPageResponse['monthlyMetrics']
	leaseAnalytics: FinancialAnalyticsPageResponse['leaseAnalytics']
}

// ============================================================================
// Lease Analytics Page Data
// ============================================================================

export interface VacancyTrendPoint {
	period: string
	vacancyRate: number
	turnovers: number
	avgVacancyDays: number
}

/**
 * Lease Analytics Page Data
 * Aggregates all lease analytics data for the lease analytics page
 */
export interface LeaseAnalyticsPageData {
	metrics: LeaseAnalyticsPageResponse['metrics']
	profitability: LeaseAnalyticsPageResponse['profitability']
	renewalRates: LeaseLifecyclePoint[]
	vacancyTrends: VacancyTrendPoint[]
	leaseDistribution: LeaseAnalyticsPageResponse['statusBreakdown']
	// Aliases for page compatibility
	lifecycle: LeaseLifecyclePoint[]
	statusBreakdown: LeaseAnalyticsPageResponse['statusBreakdown']
}

// ============================================================================
// Maintenance Insights Page Data
// ============================================================================

export interface MaintenanceCostEntry {
	category: string
	amount: number
	percentage: number
}

// Re-export from maintenance-analytics for compatibility
export type { MAMaintenanceTrendPoint as MaintenanceTrendPoint }

/**
 * Maintenance Insights Page Data
 * Aggregates all maintenance analytics data for the maintenance insights page
 */
export interface MaintenanceInsightsPageData {
	metrics: MaintenanceAnalyticsPageResponse['metrics']
	categoryBreakdown: MaintenanceAnalyticsPageResponse['categoryBreakdown']
	costTrends: MaintenanceAnalyticsPageResponse['trends']
	costBreakdown: MaintenanceCostEntry[]
	trends: MaintenanceAnalyticsPageResponse['trends']
	responseTimes: ResponseTimeEntry[]
	preventiveMaintenance: PreventiveMaintenanceEntry[]
}

// ============================================================================
// Occupancy Analytics Page Data
// ============================================================================

/**
 * Occupancy Analytics Page Data
 * Aggregates all occupancy analytics data for the occupancy analytics page
 */
export interface OccupancyAnalyticsPageData {
	metrics: OccupancyAnalyticsPageResponse['metrics']
	trends: OccupancyAnalyticsPageResponse['trends']
	propertyPerformance: PropertyPerformanceEntry[]
	seasonalPatterns: SeasonalPatternEntry[]
	vacancyAnalysis: OccupancyAnalyticsPageResponse['vacancyAnalysis']
}

// ============================================================================
// Overview Analytics Page Data
// ============================================================================

export interface FinancialOverviewSummary {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	revenueChange: number
	expenseChange: number
	avgRoi: number
}

export interface MaintenanceOverviewSummary {
	openRequests: number
	avgResponseTime: number
	completedThisMonth: number
	costThisMonth: number
}

export interface OccupancyOverviewSummary {
	currentRate: number
	vacantUnits: number
	upcomingLeaseEnds: number
	rateChange: number
}

export interface LeaseOverviewSummary {
	activeLeases: number
	expiringIn30Days: number
	renewalRate: number
	avgLeaseLength: number
}

export interface VisitorOverviewSummary {
	totalVisitors: number
	pageViews: number
	avgSessionDuration: number
	bounceRate: number
}

/**
 * Analytics Overview Page Data
 * Aggregates summary data for the analytics overview page
 */
export interface AnalyticsPageData {
	financial: FinancialOverviewSummary
	maintenance: MaintenanceOverviewSummary
	occupancy: OccupancyOverviewSummary
	lease: LeaseOverviewSummary
	visitor: VisitorOverviewSummary
}

// ============================================================================
// Property Performance Page Data
// ============================================================================

export interface PropertyMetricsSummary {
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	avgOccupancyRate: number
	averageOccupancy: number
	totalMonthlyRevenue: number
	totalRevenue: number
	bestPerformer: string | null
}

export interface UnitStatsSummary {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	avgRent: number
}

export interface UnitStatisticEntry {
	label: string
	value: number
	trend: number | null
}

export interface PropertyPerformanceDetail {
	property_id: string
	propertyName: string
	units: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	monthlyRevenue: number
	annualRevenue: number
	maintenanceScore: number
}

export interface UnitDetail {
	unit_id: string
	unit_number: string
	unitNumber: string
	property_id: string
	propertyName: string
	status: string
	monthlyRent: number
	rent: number | null
	bedrooms: number | null
	bathrooms: number | null
	tenant_id: string | null
	tenantName: string | null
}

export interface RevenueTrendPoint {
	period: string
	revenue: number
	expenses: number
	netIncome: number
}

/**
 * Property Performance Page Data
 * Aggregates all property performance analytics data
 * Extends PropertyPerformancePageResponse with additional local types
 */
export interface PropertyPerformancePageData extends PropertyPerformancePageResponse {
	// Additional fields for analytics-page-data compatibility
	revenueTrends: RevenueTrendPoint[]
}

// Re-export for convenience
export type { VisitorAnalyticsResponse }

// ============================================================================
// Leases Page Data
// ============================================================================

export interface LeaseListItem {
	id: string
	tenant_id: string
	primary_tenant_id: string | null
	tenantName: string
	property_id: string
	propertyName: string
	unit_id: string
	unitNumber: string
	startDate: string
	endDate: string
	monthlyRent: number
	status: string
}

export interface TenantListItem {
	id: string
	fullName: string
	email: string
	phone: string | null
}

export interface PropertyListItem {
	id: string
	name: string
	address: string
}

export interface LeaseMetricsSummary {
	totalLeases: number
	activeLeases: number
	expiringLeases: number
	avgMonthlyRent: number
}

/**
 * Leases Page Data
 * Aggregates all lease data for the leases page
 */
export interface LeasesPageData {
	leases: LeaseListItem[]
	tenants: TenantListItem[]
	properties: PropertyListItem[]
	metrics: LeaseMetricsSummary
}
