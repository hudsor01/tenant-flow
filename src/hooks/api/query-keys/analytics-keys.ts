/**
 * Shared analytics RPC fetchers used across several query factories.
 */

import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArrayOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

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
