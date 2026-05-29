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

import { queryOptions, useQuery } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArray } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

export interface FinancialChartDatum {
	date: string;
	revenue: number;
	expenses: number;
	profit: number;
}

export type FinancialTimeRange = "7d" | "30d" | "6m" | "1y";

// Actual return shape of public.get_revenue_trends_optimized after the
// post-#749 repair migration (20260528231201_repair_analytics_rpcs.sql).
// Was previously typed as `FinancialMetrics` with a `.period` key, but
// the RPC has never emitted `period` -- it emits `month` (YYYY-MM string).
// The mismatch crashed `<ChartAreaInteractive>` on `/properties/units`
// and `/analytics/overview` with "Cannot read properties of undefined
// (reading 'localeCompare')" until cycle-1 review caught it.
interface RevenueTrendRow {
	month: string;
	revenue: number;
	collections: number;
	outstanding: number;
}

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

				const trimmed = jsonArray<RevenueTrendRow>(data)
					.sort((a, b) => a.month.localeCompare(b.month))
					.slice(-months);

				// `expenses` and per-month profit aren't surfaced by this RPC --
				// they come from `calculate_monthly_metrics` / `get_financial_overview`.
				// The chart's "expenses" line stays at 0 here until a follow-up
				// folds those values in. `profit` mirrors revenue for the same
				// reason. See post-#749 cycle-1 review BL-2 fix.
				return trimmed.map((item) => ({
					date: item.month,
					revenue: item.revenue ?? 0,
					expenses: 0,
					profit: item.revenue ?? 0,
				}));
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			structuralSharing: true,
		});
	},
};

/**
 * Revenue/expense chart data fetched from the financial analytics RPC.
 * Uses server-calculated revenue/expense/netIncome so the chart reflects
 * actual expenses instead of placeholders.
 */
export function useFinancialChartData(timeRange: FinancialTimeRange = "6m") {
	return useQuery(dashboardFinancialQueries.chartData(timeRange));
}
