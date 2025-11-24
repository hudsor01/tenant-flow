/**
 * Analytics Page Data Types
 * Types for aggregated analytics page data functions
 * Used by analytics-page.ts to provide unified page data loading
 */

import type { FinancialAnalyticsPageResponse } from './financial-analytics'
import type { LeaseAnalyticsPageResponse, LeaseLifecyclePoint } from './lease-analytics'
import type { MaintenanceAnalyticsPageResponse } from './maintenance-analytics'
import type { OccupancyAnalyticsPageResponse } from './occupancy-analytics'
import type { LeaseStatusBreakdown } from './lease-analytics'
import type { MaintenanceCostBreakdownEntry, MaintenanceTrendPoint } from './maintenance-analytics'

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

/**
 * Lease Analytics Page Data
 * Aggregates all lease analytics data for the lease analytics page
 */
export interface LeaseAnalyticsPageData {
	metrics: LeaseAnalyticsPageResponse['metrics']
	profitability: LeaseAnalyticsPageResponse['profitability']
	renewalRates: LeaseLifecyclePoint[]
	vacancyTrends: unknown[] // TODO: Define proper type
	leaseDistribution: LeaseAnalyticsPageResponse['statusBreakdown']
	lifecycle?: LeaseLifecyclePoint[] // For backward compatibility
	statusBreakdown?: LeaseStatusBreakdown[] // For backward compatibility
}

/**
 * Maintenance Insights Page Data
 * Aggregates all maintenance analytics data for the maintenance insights page
 */
export interface MaintenanceInsightsPageData {
	metrics: MaintenanceAnalyticsPageResponse['metrics']
	categoryBreakdown: MaintenanceAnalyticsPageResponse['categoryBreakdown']
	costTrends: MaintenanceAnalyticsPageResponse['trends']
	responseTimes: unknown[] // TODO: Define proper type
	preventiveMaintenance: unknown[] // TODO: Define proper type
	costBreakdown?: MaintenanceCostBreakdownEntry[] // For backward compatibility
	trends?: MaintenanceTrendPoint[] // For backward compatibility
}

/**
 * Occupancy Analytics Page Data
 * Aggregates all occupancy analytics data for the occupancy analytics page
 */
export interface OccupancyAnalyticsPageData {
	metrics: OccupancyAnalyticsPageResponse['metrics']
	trends: OccupancyAnalyticsPageResponse['trends']
	propertyPerformance: unknown[] // TODO: Define proper type
	seasonalPatterns: unknown[] // TODO: Define proper type
	vacancyAnalysis: OccupancyAnalyticsPageResponse['vacancyAnalysis']
}

/**
 * Analytics Overview Page Data
 * Aggregates all analytics data for the analytics overview page
 */
export interface AnalyticsPageData {
	financial: unknown // TODO: Define proper type
	maintenance: unknown // TODO: Define proper type
	occupancy: unknown // TODO: Define proper type
	lease: unknown // TODO: Define proper type
	visitor: unknown // TODO: Define proper type
	dashboardStats?: unknown // For backward compatibility
	propertyPerformance?: unknown // For backward compatibility
	financialStats?: unknown // For backward compatibility
}

/**
 * Property Performance Page Data
 * Aggregates all property performance analytics data
 */
export interface PropertyPerformancePageData {
	metrics: unknown // TODO: Define proper type
	unitStats: unknown[] // TODO: Define proper type
	performance: unknown[] // TODO: Define proper type
	units: unknown[] // TODO: Define proper type
	revenueTrends: unknown[] // TODO: Define proper type
	visitorAnalytics?: unknown // For backward compatibility
}

/**
 * Leases Page Data
 * Aggregates all lease data for the tenants page
 */
export interface LeasesPageData {
	leases: unknown[] // TODO: Define proper type
	tenants: unknown[] // TODO: Define proper type
	properties: unknown[] // TODO: Define proper type
	metrics: unknown // TODO: Define proper type
}