/**
 * Unit tests for the tenant-stats boundary mapper (PERF-03, Phase 3).
 *
 * `mapTenantStats` validates the `get_tenant_stats` RPC jsonb at the boundary,
 * mirroring `mapMaintenanceRow`: each numeric count field is Zod-validated via
 * `safeParse` so a dropped/renamed RPC key throws a descriptive
 * `mapTenantStats:` error instead of leaking `undefined`. The remaining
 * `TenantStats` fields (totalTenants / activeTenants / newThisMonth) are DERIVED
 * per the LOCKED contract in 03-CONTEXT.md.
 *
 * Note: the RPC counts by `tenants.status` — the CORRECT source — so the
 * active/inactive values may differ from the old buggy `.eq("users.status", ...)`
 * path. That is the deliberate PERF-03 correctness fix, NOT a regression.
 */

import { describe, expect, it } from "vitest";
import { mapTenantStats } from "./tenant-stats-mapper";

const validRaw = {
	total: 15,
	active: 12,
	inactive: 3,
};

describe("mapTenantStats", () => {
	it("maps the RPC jsonb to the TenantStats shape with derived fields", () => {
		const mapped = mapTenantStats(validRaw);
		expect(mapped.total).toBe(15);
		expect(mapped.active).toBe(12);
		expect(mapped.inactive).toBe(3);
		// Derived per the LOCKED contract.
		expect(mapped.totalTenants).toBe(15);
		expect(mapped.activeTenants).toBe(12);
		expect(mapped.newThisMonth).toBe(0); // preserved stub
	});

	it("handles all-zero counts", () => {
		const mapped = mapTenantStats({ total: 0, active: 0, inactive: 0 });
		expect(mapped.total).toBe(0);
		expect(mapped.active).toBe(0);
		expect(mapped.inactive).toBe(0);
		expect(mapped.totalTenants).toBe(0);
		expect(mapped.activeTenants).toBe(0);
		expect(mapped.newThisMonth).toBe(0);
	});

	it("throws when a count field is missing (Zod safeParse fails loudly)", () => {
		const { active: _omit, ...withoutActive } = validRaw;
		expect(() => mapTenantStats(withoutActive)).toThrow(/mapTenantStats/);
	});

	it("throws when a count field is non-numeric", () => {
		expect(() => mapTenantStats({ ...validRaw, inactive: "3" })).toThrow(
			/mapTenantStats/,
		);
	});

	it("throws on a null raw value", () => {
		expect(() => mapTenantStats(null)).toThrow(/mapTenantStats/);
	});

	it("surfaces a descriptive boundary error message on drift", () => {
		expect(() => mapTenantStats({ ...validRaw, total: undefined })).toThrow(
			expect.objectContaining({
				message: expect.stringContaining("mapTenantStats"),
			}),
		);
	});
});
