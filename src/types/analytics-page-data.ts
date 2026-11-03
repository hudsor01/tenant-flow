/**
 * Analytics Page Data
 * The shapes the analytics page queries return (src/hooks/api/use-analytics.ts),
 * each holding only what a screen renders. The occupancy, lease and maintenance
 * shapes carried fields no source filled, written as [] or 0 and read nowhere,
 * and page types no query returned; they went in 66.2-39 (part R).
 */

import type {
	FinancialAnalyticsPageResponse,
	MaintenanceCategoryBreakdown,
	MaintenanceCostBreakdownEntry,
	MaintenanceCostSummary,
	MaintenanceTrendPoint,
	OccupancyTrendPoint,
	PropertyPerformancePageResponse,
} from "./analytics";

/**
 * Financial Analytics Page Data
 * Aggregates all financial analytics data for the financial analytics page
 */
export interface FinancialAnalyticsPageData {
	metrics: FinancialAnalyticsPageResponse["metrics"];
	breakdown: FinancialAnalyticsPageResponse["breakdown"];
	netOperatingIncome: FinancialAnalyticsPageResponse["netOperatingIncome"];
	monthlyMetrics: FinancialAnalyticsPageResponse["monthlyMetrics"];
	leaseProfitability: FinancialAnalyticsPageResponse["leaseProfitability"];
}

/**
 * The maintenance insights section's data (get_maintenance_analytics): the
 * requests by status, the spend and its vendors, and the requests by month.
 */
export interface MaintenanceInsightsPageData {
	categoryBreakdown: MaintenanceCategoryBreakdown[];
	/** The spend to date; null when the server cannot report it yet. */
	costs: MaintenanceCostSummary | null;
	/** `costs.vendors` as the cost chart's bars; empty when costs are null. */
	costBreakdown: MaintenanceCostBreakdownEntry[];
	/** Requests by month; null when the server cannot report them yet. */
	trends: MaintenanceTrendPoint[] | null;
}

/**
 * The properties insights' occupancy chart (get_occupancy_trends_optimized),
 * oldest month first.
 */
export interface OccupancyAnalyticsPageData {
	trends: OccupancyTrendPoint[];
}

/**
 * The property performance page's data: the RPC's per-property rows and the
 * owner's counted units. It carried a visitor analytics summary (no visitor
 * tracking exists) and revenue trends, written as zeros and [] and never read.
 */
export type PropertyPerformancePageData = PropertyPerformancePageResponse;
