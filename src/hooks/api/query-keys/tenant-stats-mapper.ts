/**
 * Tenant-stats boundary mapper (PERF-03, Phase 3 — typed RPC boundaries).
 *
 * `mapTenantStats` maps the `get_tenant_stats(p_user_id)` RPC jsonb into the
 * strictly-typed `TenantStats` (= `src/types/stats.ts`), Zod-validating at the
 * boundary. Mirrors `mapMaintenanceRow` in `maintenance-mappers.ts` (CLAUDE.md's
 * "RPC / PostgREST Return Typing" rule): the numeric count fields are validated
 * via `safeParse` so a dropped/renamed RPC key throws a descriptive
 * `mapTenantStats:` error rather than leaking `undefined`.
 *
 * The RPC returns the raw aggregates (`{ total, active, inactive }`), counting
 * by `tenants.status` (the CORRECT source). The old path counted active/inactive
 * via a broken `.eq("users.status", ...)` filter on a non-inner-joined `users`
 * embed — so these values may legitimately DIFFER from the old (buggy) numbers.
 * That is the deliberate PERF-03 correctness fix, NOT a regression.
 *
 * The remaining `TenantStats` fields are DERIVED here per the LOCKED contract:
 *   - totalTenants  = total
 *   - activeTenants = active
 *   - newThisMonth  = 0  (preserved stub)
 */

import { z } from "zod";
import type { TenantStats } from "#types/stats";

// The raw jsonb aggregate contract from `get_tenant_stats` (Plan 03-01). Each
// count is NOT NULL in the RPC return, so `z.number()` runs unconditionally —
// a missing/non-numeric key fails the safeParse and throws at the boundary.
const tenantStatsRpcSchema = z.object({
	total: z.number(),
	active: z.number(),
	inactive: z.number(),
});

/**
 * Map the `get_tenant_stats` RPC jsonb to the strictly-typed `TenantStats`,
 * deriving totalTenants / activeTenants / newThisMonth per the LOCKED contract.
 * Throws a descriptive `mapTenantStats:` error if any numeric count field is
 * missing or non-numeric.
 */
export function mapTenantStats(raw: unknown): TenantStats {
	const parsed = tenantStatsRpcSchema.safeParse(raw);
	if (!parsed.success) {
		throw new Error(
			`mapTenantStats: malformed get_tenant_stats response — ${parsed.error.message}`,
		);
	}

	const { total, active, inactive } = parsed.data;

	return {
		total,
		active,
		inactive,
		newThisMonth: 0,
		totalTenants: total,
		activeTenants: active,
	};
}
