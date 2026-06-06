/**
 * Unit-stats boundary mapper (PERF-02, Phase 3 — typed RPC boundaries).
 *
 * `mapUnitStats` maps the `get_unit_stats(p_user_id)` RPC jsonb into the
 * strictly-typed `UnitStats` (= `src/types/stats.ts`), Zod-validating at the
 * boundary. Mirrors `mapMaintenanceRow` in `maintenance-mappers.ts` (CLAUDE.md's
 * "RPC / PostgREST Return Typing" rule): the numeric count fields are validated
 * via `safeParse` so a dropped/renamed RPC key throws a descriptive
 * `mapUnitStats:` error rather than leaking `undefined` into the KPI cards.
 *
 * The RPC returns only the raw aggregates
 * (`{ total, occupied, available, maintenance, totalActualRent }`); the remaining
 * `UnitStats` fields are DERIVED here per the LOCKED no-regression contract in
 * 03-CONTEXT.md so the final values stay IDENTICAL to the old multi-query path:
 *   - vacant            = available
 *   - occupancyRate     = total > 0 ? round(occupied / total * 100) : 0
 *   - averageRent       = total > 0 ? totalActualRent / total : 0
 *   - occupancyChange   = 0  (preserved hardcoded stub)
 *   - totalPotentialRent = totalActualRent  (preserved alias)
 *
 * The old path divided `totalActualRent` by `rentAmounts.length`, which equals
 * the non-inactive row count == `total`, so dividing by `total` here is the same
 * value (pinned in the no-regression test).
 */

import { z } from "zod";
import type { UnitStats } from "#types/stats";

// The raw jsonb aggregate contract from `get_unit_stats` (Plan 03-01). Each
// count is NOT NULL in the RPC return, so `z.number()` runs unconditionally —
// a missing/non-numeric key fails the safeParse and throws at the boundary.
const unitStatsRpcSchema = z.object({
	total: z.number(),
	occupied: z.number(),
	available: z.number(),
	maintenance: z.number(),
	totalActualRent: z.number(),
});

/**
 * Map the `get_unit_stats` RPC jsonb to the strictly-typed `UnitStats`,
 * deriving vacant / occupancyRate / averageRent / occupancyChange /
 * totalPotentialRent per the LOCKED contract. Throws a descriptive
 * `mapUnitStats:` error if any numeric count field is missing or non-numeric.
 */
export function mapUnitStats(raw: unknown): UnitStats {
	const parsed = unitStatsRpcSchema.safeParse(raw);
	if (!parsed.success) {
		throw new Error(
			`mapUnitStats: malformed get_unit_stats response — ${parsed.error.message}`,
		);
	}

	const { total, occupied, available, maintenance, totalActualRent } =
		parsed.data;

	const vacant = available;
	const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
	const averageRent = total > 0 ? totalActualRent / total : 0;

	return {
		total,
		occupied,
		vacant,
		maintenance,
		available,
		averageRent,
		occupancyRate,
		occupancyChange: 0,
		totalPotentialRent: totalActualRent,
		totalActualRent,
	};
}
