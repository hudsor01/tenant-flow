/**
 * Analytics Page Data
 * The shapes the analytics page queries return (src/hooks/api/use-analytics.ts),
 * each holding only what a screen or an export renders. The occupancy, lease
 * and maintenance shapes carried fields no source filled, written as [] or 0
 * and read nowhere, and page types no query returned; they went in 66.2-39
 * (part R). Fields a query wrote and nothing read (the financial page's
 * expense total, cash flow and totals, the expense and vendor shares, the
 * monthly unit counts and resolution times, ids no row is keyed by) went in
 * 66.2-39 fix round 3.
 */

import type {
	FinancialMetricSummary,
	LeaseProfitability,
	MaintenanceCategoryBreakdown,
	MaintenanceCostBreakdownEntry,
	MaintenanceCostSummary,
	MaintenanceTrendPoint,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	OccupancyTrendPoint,
	PropertyPerformancePageResponse,
	RevenueExpenseBreakdown,
} from "./analytics";

/**
 * The financial analytics page's data: the headline figures, the expense
 * breakdown, the Scheduled Net and Scheduled Rent & Expenses series, and the
 * lease profitability table.
 */
export interface FinancialAnalyticsPageData {
	metrics: FinancialMetricSummary;
	breakdown: RevenueExpenseBreakdown;
	netOperatingIncome: NetOperatingIncomeByProperty[];
	monthlyMetrics: MonthlyFinancialMetric[];
	leaseProfitability: LeaseProfitability;
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
