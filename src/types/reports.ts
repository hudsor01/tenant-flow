import type { MaintenanceCostSummary } from "./analytics";

export interface RevenueData {
	month: string;
	revenue: number;
	expenses: number;
	profit: number;
}

export interface OccupancyMetrics {
	totalUnits: number;
	occupiedUnits: number;
	vacantUnits: number;
	occupancyRate: number;
	byProperty: Array<{
		property_id: string;
		propertyName: string;
		totalUnits: number;
		occupiedUnits: number;
		occupancyRate: number;
	}>;
}

/**
 * reportAnalyticsQueries.financial: the period's expenses by vendor
 * (get_expense_summary's categories). The executive and financial-performance
 * exports read their revenue, net income and cash flow from the income
 * statement and the cash flow (financialQueries), never scheduled rent.
 */
export interface FinancialReport {
	expenseBreakdown: Array<{
		category: string;
		amount: number;
	}>;
}

export interface PropertyReport {
	summary: {
		/** The properties the owner still has (a deleted one is not counted). */
		totalProperties: number;
	};
	/**
	 * Per property over the report's period. The three dollar figures are null
	 * when the server cannot report rent received yet (the body before
	 * 20261102163709): never 0 for a figure that was not computed.
	 * `occupancyRate` is today's, not the period's.
	 */
	byProperty: Array<{
		propertyId: string;
		/** As the report prints it: a property deleted since says so. */
		propertyName: string;
		/** Deleted since the period (listed for its rent or spend in it). */
		deleted: boolean;
		occupancyRate: number;
		rentReceived: number | null;
		expenses: number | null;
		netIncome: number | null;
	}>;
}

/**
 * The lease portfolio report's figures, as of today (get_dashboard_stats
 * takes no dates). `leasesEndingSoon` counts the active leases whose end date
 * is within 30 days (or already past): the RPC's `expiringSoon`.
 */
export interface TenantReport {
	summary: {
		totalTenants: number;
		activeLeases: number;
		leasesEndingSoon: number;
	};
}

/**
 * The maintenance report's figures. `costs` is the spend to date that
 * get_maintenance_analytics computes from the expenses (20261102184503), read
 * by the same mapper as the insights tab; null when the server cannot report
 * it yet (the body before returns its costs as the literal 0 and []).
 */
export interface MaintenanceReport {
	summary: {
		totalRequests: number;
		openRequests: number;
		avgResolutionHours: number;
	};
	costs: MaintenanceCostSummary | null;
	byStatus: Array<{
		status: string;
		count: number;
	}>;
	byPriority: Array<{
		priority: string;
		count: number;
	}>;
}

/**
 * The year-end report on a cash basis: rent received in the tax year, from
 * the rent ledger, less the year's expenses.
 */
export interface YearEndSummary {
	year: number;
	/** Rent received in the year (fetchRentReceivedInYear). */
	rentReceived: number;
	operatingExpenses: number;
	/** rentReceived - operatingExpenses. */
	netIncome: number;
	/**
	 * Each property's rent received and expenses in the year, a property the
	 * owner has deleted since included, so they sum to the summary's figures.
	 */
	byProperty: Array<{
		propertyId: string;
		/** As the report prints it: a property deleted since says so. */
		propertyName: string;
		deleted: boolean;
		rentReceived: number;
		expenses: number;
		netIncome: number;
	}>;
	expenseByCategory: Array<{
		category: string;
		amount: number;
	}>;
}

/**
 * reportAnalyticsQueries.yearEnd's result. `ledger-unavailable` when the
 * server cannot report rent received for the year yet (get_billing_insights
 * before 20261102055449, or get_property_performance_analytics before
 * 20261102163709): the page says so instead of presenting $0 as a tax year's
 * income.
 */
export type YearEndResult =
	| { readonly status: "ready"; readonly summary: YearEndSummary }
	| { readonly status: "ledger-unavailable"; readonly year: number };
