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

export type FinancialTimeRange = "3m" | "6m" | "1y";

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

// One per-month expense bucket from `public.get_expense_summary`. The RPC's
// generated type is `Returns: Json`, so validate the shape at the boundary
// (typed mapper — never `as unknown as`, per CLAUDE.md #8). Mirrors the
// canonical `monthly_totals` mapping in `financial-keys.ts#expenseSummary`.
interface ExpenseMonthlyTotal {
	month: string;
	amount: number;
}

function mapExpenseMonthlyTotals(data: unknown): ExpenseMonthlyTotal[] {
	const summary = data as Record<string, unknown> | null;
	const rows = (summary?.monthly_totals ?? []) as Array<
		Record<string, unknown>
	>;
	// `monthly_totals` is the per-bucket series; `total_amount` is a period
	// scalar and must NOT be used to key months.
	return rows.map((row) => ({
		month: String(row.month ?? ""),
		amount: Number(row.amount ?? 0),
	}));
}

// Month windows only. The old `7d`/`30d` toggles both mapped to 1 → the chart
// collapsed to a single partial-month bucket (the schema has no day-level
// revenue: revenue = monthly expected MRR via get_revenue_trends_optimized).
// Mirrors the sibling analytics `revenue-expense-chart.tsx` range vocabulary.
const timeRangeToMonths: Record<FinancialTimeRange, number> = {
	"3m": 3,
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

				// Revenue (monthly MRR trend) and real per-month expenses in
				// parallel. Both RPCs key months as 'YYYY-MM' and both are dollars,
				// so they join cleanly by month.
				const [revenueResult, expenseResult] = await Promise.all([
					supabase.rpc("get_revenue_trends_optimized", {
						p_user_id: user.id,
						p_months: 12,
					}),
					supabase.rpc("get_expense_summary", { p_user_id: user.id }),
				]);
				if (revenueResult.error)
					handlePostgrestError(revenueResult.error, "analytics");
				if (expenseResult.error)
					handlePostgrestError(expenseResult.error, "analytics expenses");

				const revenueData = revenueResult.data;
				if (!Array.isArray(revenueData) || revenueData.length === 0) return [];

				const trimmed = jsonArray<RevenueTrendRow>(revenueData)
					.sort((a, b) => a.month.localeCompare(b.month))
					.slice(-months);

				const expenseByMonth = new Map<string, number>(
					mapExpenseMonthlyTotals(expenseResult.data).map(
						(row): [string, number] => [row.month, row.amount],
					),
				);

				// Real expenses joined per month; profit = revenue - expenses.
				// (Previously hardcoded `expenses: 0` / `profit: revenue`, which
				// rendered a permanent, meaningless 100% margin.)
				return trimmed.map((item) => ({
					date: item.month,
					revenue: item.revenue ?? 0,
					expenses: expenseByMonth.get(item.month) ?? 0,
					profit: (item.revenue ?? 0) - (expenseByMonth.get(item.month) ?? 0),
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
