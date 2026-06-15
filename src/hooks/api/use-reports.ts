/**
 * Reports Query Hooks — queries only, mutations in use-report-mutations.ts.
 * Query options defined in query-keys/report-keys.ts.
 */

import { useQuery } from "@tanstack/react-query";
import { reportAnalyticsQueries } from "./query-keys/report-analytics-keys";
import { reportKeys, reportQueries } from "./query-keys/report-keys";

// Re-export keys and queries for backwards compatibility and tests
export { reportKeys as reportsKeys, reportQueries as reportsQueries };

export function useMonthlyRevenue(months: number = 12) {
	return useQuery(reportQueries.monthlyRevenue(months));
}

export function usePaymentAnalytics(start_date?: string, end_date?: string) {
	return useQuery(
		reportAnalyticsQueries.paymentAnalytics(start_date, end_date),
	);
}

export function useOccupancyMetrics() {
	return useQuery(reportAnalyticsQueries.occupancyMetrics());
}

export function useFinancialReport(start_date?: string, end_date?: string) {
	return useQuery(reportAnalyticsQueries.financial(start_date, end_date));
}

export function usePropertyReport(start_date?: string, end_date?: string) {
	return useQuery(reportAnalyticsQueries.properties(start_date, end_date));
}

export function useTenantReport(start_date?: string, end_date?: string) {
	return useQuery(reportAnalyticsQueries.tenants(start_date, end_date));
}

export function useMaintenanceReport(start_date?: string, end_date?: string) {
	return useQuery(reportAnalyticsQueries.maintenance(start_date, end_date));
}

export function useYearEndSummary(year: number) {
	return useQuery(reportAnalyticsQueries.yearEnd(year));
}

export function useReport1099Summary(year: number) {
	return useQuery(reportAnalyticsQueries.report1099(year));
}
