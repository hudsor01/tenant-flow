/**
 * The shared `get_occupancy_trends_optimized` fetcher: the occupancy analytics
 * query (use-analytics.ts) and the reports' occupancy metrics
 * (report-analytics-keys.ts) both call it.
 */

import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArrayOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

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
	// (element[0] = latest month), not an object: jsonArrayOrEmpty checks it
	// at the boundary. Empty/null degrades to [].
	return jsonArrayOrEmpty<Record<string, unknown>>(data);
}
