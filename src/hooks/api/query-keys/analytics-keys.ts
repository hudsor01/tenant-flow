/**
 * Shared analytics RPC fetchers used across several query factories.
 */

import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArrayOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

export interface MonthlyRevenueExpense {
	month: string;
	revenue: number;
	expenses: number;
}

/**
 * Build a `Map<'YYYY-MM', dollars>` from `get_expense_summary.monthly_totals`.
 * `monthly_totals` is the per-month series (a fixed trailing-12-month window);
 * `total_amount` is a period scalar and must NOT be used to key months. Mirrors
 * the canonical `monthly_totals` mapping in
 * `use-owner-dashboard-financial.ts#mapExpenseMonthlyTotals` and
 * `financial-keys.ts#expenseSummary` — validated at the boundary, never
 * `as unknown as` (CLAUDE.md #8).
 */
export function expenseTotalsByMonth(data: unknown): Map<string, number> {
	const summary = data as Record<string, unknown> | null;
	const rows = (summary?.monthly_totals ?? []) as Array<
		Record<string, unknown>
	>;
	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(String(row.month ?? ""), Number(row.amount ?? 0));
	}
	return map;
}

/**
 * Join monthly revenue (`get_revenue_trends_optimized`) with real per-month
 * expenses (`get_expense_summary.monthly_totals`) by 'YYYY-MM'. Both RPCs key
 * months identically and both are integer dollars, so they join cleanly via a
 * Map (never by index — the expense series is a fixed trailing-12-month window
 * while revenue honors `p_months`; missing months resolve to 0). This mirrors
 * the shipped `use-owner-dashboard-financial.ts` join and is the single source
 * of truth for the revenue+expense series of `reportQueries.monthlyRevenue()`
 * (TYPE-06).
 */
export async function fetchRevenueWithExpenses(
	months: number,
): Promise<MonthlyRevenueExpense[]> {
	const supabase = createClient();
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");

	const [revenueResult, expenseResult] = await Promise.all([
		supabase.rpc("get_revenue_trends_optimized", {
			p_user_id: user.id,
			p_months: months,
		}),
		supabase.rpc("get_expense_summary", { p_user_id: user.id }),
	]);
	if (revenueResult.error)
		handlePostgrestError(revenueResult.error, "analytics");
	if (expenseResult.error)
		handlePostgrestError(expenseResult.error, "analytics expenses");

	const revenueRows = jsonArrayOrEmpty<Record<string, unknown>>(
		revenueResult.data,
	);
	const expenseByMonth = expenseTotalsByMonth(expenseResult.data);

	return revenueRows.map((row): MonthlyRevenueExpense => {
		const month = String(row.month ?? "");
		return {
			month,
			revenue: Number(row.revenue ?? 0),
			expenses: expenseByMonth.get(month) ?? 0,
		};
	});
}

/**
 * Shared RPC call for get_occupancy_trends_optimized.
 * Single source of truth -- all consumers call this function.
 * Uses correct param name p_owner_id (not p_user_id).
 */
export async function fetchOccupancyTrends(
	months: number,
): Promise<Array<Record<string, unknown>>> {
	const supabase = createClient();
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");
	const { data, error } = await supabase.rpc("get_occupancy_trends_optimized", {
		p_owner_id: user.id,
		p_months: months,
	});
	if (error) handlePostgrestError(error, "analytics");
	// get_occupancy_trends_optimized returns a jsonb ARRAY ordered month DESC
	// (element[0] = latest month), not an object — route it through the same
	// boundary helper as revenue trends. Empty/null degrades to [].
	return jsonArrayOrEmpty<Record<string, unknown>>(data);
}
