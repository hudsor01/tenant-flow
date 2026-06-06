/**
 * Unit tests for the unit-stats boundary mapper (PERF-02, Phase 3).
 *
 * `mapUnitStats` validates the `get_unit_stats` RPC jsonb at the boundary,
 * mirroring `mapMaintenanceRow` in `maintenance-mappers.ts`: each numeric count
 * field is Zod-validated via `safeParse` so a dropped/renamed RPC key throws a
 * descriptive `mapUnitStats:` error instead of leaking `undefined` into the KPI
 * cards. The remaining `UnitStats` fields (vacant / occupancyRate / averageRent /
 * occupancyChange / totalPotentialRent) are DERIVED per the LOCKED no-regression
 * contract in 03-CONTEXT.md — the final values must be identical to the old
 * multi-query path.
 */

import { describe, expect, it } from "vitest";
import { mapUnitStats } from "./unit-mappers";

const validRaw = {
	total: 10,
	occupied: 6,
	available: 3,
	maintenance: 1,
	totalActualRent: 12000,
};

describe("mapUnitStats", () => {
	it("maps the RPC jsonb to the UnitStats shape with derived fields", () => {
		const mapped = mapUnitStats(validRaw);
		expect(mapped.total).toBe(10);
		expect(mapped.occupied).toBe(6);
		expect(mapped.available).toBe(3);
		expect(mapped.maintenance).toBe(1);
		expect(mapped.totalActualRent).toBe(12000);
		// Derived per the LOCKED contract.
		expect(mapped.vacant).toBe(3); // vacant = available
		expect(mapped.occupancyChange).toBe(0); // preserved stub
		expect(mapped.totalPotentialRent).toBe(12000); // alias of totalActualRent
	});

	it("pins the no-regression values for the {10,6,3,1,12000} fixture", () => {
		// IDENTICAL to what the old 4-HEAD-count + unbounded-rent-fetch path
		// produced for the same aggregates: occupancyRate = round(6/10*100) = 60,
		// averageRent = 12000/10 = 1200 (old path divided by rentAmounts.length
		// which equals the non-inactive row count == total).
		const mapped = mapUnitStats(validRaw);
		expect(mapped.occupancyRate).toBe(60);
		expect(mapped.averageRent).toBe(1200);
		expect(mapped.vacant).toBe(3);
		expect(mapped.occupancyChange).toBe(0);
		expect(mapped.totalPotentialRent).toBe(12000);
		expect(mapped.totalActualRent).toBe(12000);
	});

	it("rounds occupancyRate to the nearest integer (matching the old Math.round)", () => {
		// 5/9 = 55.55... -> round -> 56
		const mapped = mapUnitStats({
			total: 9,
			occupied: 5,
			available: 3,
			maintenance: 1,
			totalActualRent: 9000,
		});
		expect(mapped.occupancyRate).toBe(56);
		expect(mapped.averageRent).toBe(1000);
	});

	it("guards divide-by-zero when total is 0", () => {
		const mapped = mapUnitStats({
			total: 0,
			occupied: 0,
			available: 0,
			maintenance: 0,
			totalActualRent: 0,
		});
		expect(mapped.occupancyRate).toBe(0);
		expect(mapped.averageRent).toBe(0);
	});

	it("throws when a count field is missing (Zod safeParse fails loudly)", () => {
		const { occupied: _omit, ...withoutOccupied } = validRaw;
		expect(() => mapUnitStats(withoutOccupied)).toThrow(/mapUnitStats/);
	});

	it("throws when a count field is non-numeric", () => {
		expect(() =>
			mapUnitStats({ ...validRaw, totalActualRent: "12000" }),
		).toThrow(/mapUnitStats/);
	});

	it("throws on a null raw value", () => {
		expect(() => mapUnitStats(null)).toThrow(/mapUnitStats/);
	});

	it("surfaces a descriptive boundary error message on drift", () => {
		expect(() => mapUnitStats({ ...validRaw, total: undefined })).toThrow(
			expect.objectContaining({
				message: expect.stringContaining("mapUnitStats"),
			}),
		);
	});
});
