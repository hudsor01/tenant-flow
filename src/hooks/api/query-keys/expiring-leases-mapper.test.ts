/**
 * Unit tests for the expiring-leases boundary mapper (TYPE-03, Phase 2).
 *
 * `mapExpiringLeaseRow` validates a nested `leases` PostgREST FK-join row at the
 * boundary, mirroring `mapDocumentRow` in
 * `src/hooks/api/query-keys/document-keys.ts` (CLAUDE.md's cited reference):
 * NOT-NULL fields (`id`/`end_date`/`rent_amount`) throw if absent or the wrong
 * type, and the nullable FK joins (`tenants`/`units`/`units.properties`) stay
 * nullable so an absent join maps to `null` instead of throwing.
 *
 * Vitest-4 + chai-6 gotcha: assert thrown messages via
 * `.toThrow(/.../)` / `expect(fn).toThrow()`, never `.toThrow("plain string")`.
 */

import { describe, expect, it } from "vitest";
import { mapExpiringLeaseRow } from "./expiring-leases-mapper";

const fullRow = {
	id: "00000000-0000-0000-0000-000000000001",
	end_date: "2026-08-01",
	rent_amount: 1850,
	tenants: { name: "Jane Doe" },
	units: {
		unit_number: "4B",
		properties: { name: "Maple Court" },
	},
};

describe("mapExpiringLeaseRow", () => {
	it("maps a valid nested join row to the flat ExpiringLeaseRow with all join names populated", () => {
		expect(mapExpiringLeaseRow(fullRow)).toEqual({
			id: "00000000-0000-0000-0000-000000000001",
			end_date: "2026-08-01",
			rent_amount: 1850,
			tenant_name: "Jane Doe",
			unit_name: "4B",
			property_name: "Maple Court",
		});
	});

	it("maps tenants:null and units:null to tenant_name/unit_name/property_name all null", () => {
		const row = {
			id: "00000000-0000-0000-0000-000000000002",
			end_date: "2026-09-15",
			rent_amount: 2000,
			tenants: null,
			units: null,
		};

		expect(mapExpiringLeaseRow(row)).toEqual({
			id: "00000000-0000-0000-0000-000000000002",
			end_date: "2026-09-15",
			rent_amount: 2000,
			tenant_name: null,
			unit_name: null,
			property_name: null,
		});
	});

	it("maps a present units with units.properties:null to property_name null", () => {
		const row = {
			id: "00000000-0000-0000-0000-000000000003",
			end_date: "2026-10-01",
			rent_amount: 1500,
			tenants: { name: "Sam Smith" },
			units: { unit_number: "1A", properties: null },
		};

		const mapped = mapExpiringLeaseRow(row);
		expect(mapped.unit_name).toBe("1A");
		expect(mapped.property_name).toBeNull();
		expect(mapped.tenant_name).toBe("Sam Smith");
	});

	it("throws when the NOT-NULL id field is missing", () => {
		const { id: _omit, ...withoutId } = fullRow;
		expect(() => mapExpiringLeaseRow(withoutId)).toThrow(
			/mapExpiringLeaseRow: invalid expiring-lease row/,
		);
	});

	it("rejects a row where rent_amount is a string (RPC drift)", () => {
		const row = { ...fullRow, rent_amount: "1850" };
		expect(() => mapExpiringLeaseRow(row)).toThrow(
			/mapExpiringLeaseRow: invalid expiring-lease row at 'rent_amount'/,
		);
	});
});
