"use client";

/**
 * Financial chart sub-feature for the owner dashboard. Calls
 * `get_revenue_trends_optimized` and shapes the response into
 * `FinancialChartDatum[]` for the analytics financial chart.
 *
 * Extracted from `use-owner-dashboard.ts` during Phase 4 cycle-1 review.
 * Shares the canonical `ownerDashboardKeys` factory so cache invalidation
 * via `ownerDashboardKeys.financial.all()` flushes this query alongside
 * the rest of the financial section.
 */

import { queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { FinancialMetrics } from "#types/core";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

export interface FinancialChartDatum {
	date: string;
	revenue: number;
	expenses: number;
	profit: number;
}

export type FinancialTimeRange = "7d" | "30d" | "6m" | "1y";

const timeRangeToMonths: Record<FinancialTimeRange, number> = {
	"7d": 1,
	"30d": 1,
	"6m": 6,
	"1y": 12,
};

export const dashboardFinancialQueries = {
	chartData: (timeRange: FinancialTimeRange = "6m") => {
		const months = timeRangeToMonths[timeRange] ?? 6;
		const currentYear = new Date().getFullYear();
		return queryOptions({
			queryKey: ownerDashboardKeys.financial.chartData(
				currentYear,
				timeRange,
				months,
			),
			queryFn: async (): Promise<FinancialChartDatum[]> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase.rpc(
					"get_revenue_trends_optimized",
					{ p_user_id: user.id, p_months: 12 },
				);
				if (error) handlePostgrestError(error, "analytics");

				if (!Array.isArray(data) || data.length === 0) return [];

				const trimmed = (data as FinancialMetrics[])
					.sort((a, b) => a.period.localeCompare(b.period))
					.slice(-months);

				return trimmed.map((item) => ({
					date: item.period,
					revenue: item.revenue ?? 0,
					expenses: item.expenses ?? 0,
					profit: item.netIncome ?? (item.revenue ?? 0) - (item.expenses ?? 0),
				}));
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			structuralSharing: true,
		});
	},
};
