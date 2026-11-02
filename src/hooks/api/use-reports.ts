/**
 * Reports Query Hooks — queries only, mutations in use-report-mutations.ts.
 * Query options defined in query-keys/report-analytics-keys.ts.
 */

import { useQuery } from "@tanstack/react-query";
import { reportAnalyticsQueries } from "./query-keys/report-analytics-keys";

export function useYearEndSummary(year: number) {
	return useQuery(reportAnalyticsQueries.yearEnd(year));
}

export function useReport1099Summary(year: number) {
	return useQuery(reportAnalyticsQueries.report1099(year));
}
