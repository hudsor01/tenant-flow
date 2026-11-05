/**
 * Unit tests for the maintenance boundary mapper (TYPE-02, Phase 2).
 *
 * `mapMaintenanceRow` validates a `maintenance_requests` PostgREST row at the
 * boundary, mirroring `mapDocumentRow` in `document-keys.ts` (CLAUDE.md's cited
 * reference): NOT-NULL fields throw if absent, `status`/`priority` are validated
 * via Zod `safeParse`, and nullable-in-DB fields stay nullable.
 *
 * The critical pins here: persisted `status` is validated against the FULL
 * 7-value DB CHECK set (migration 20260221120000), NOT the stale 5-value input
 * `maintenanceStatusSchema`. So `status: "assigned"` and `status:
 * "needs_reassignment"` (set from the kanban and the detail StatusSelect) MUST
 * map cleanly — validating against the 5-value input enum would throw on those
 * rows and break the maintenance list/detail/kanban surfaces in prod. The
 * `status` safeParse is unconditional, so an absent/null status throws too.
 */

import { describe, expect, it } from "vitest";
import {
	mapMaintenanceDetailRow,
	mapMaintenanceListRow,
	mapMaintenanceRow,
} from "./maintenance-mappers";

const validRow = {
	id: "00000000-0000-0000-0000-000000000001",
	owner_user_id: "00000000-0000-0000-0000-0000000000ff",
	unit_id: "00000000-0000-0000-0000-000000000002",
	tenant_id: "00000000-0000-0000-0000-000000000003",
	title: "Leaky faucet",
	description: "Kitchen faucet drips continuously",
	priority: "high",
	status: "open",
	vendor_id: null,
	requested_by: null,
	assigned_to: null,
	estimated_cost: null,
	scheduled_date: null,
	completed_at: null,
	inspection_date: null,
	inspection_findings: null,
	inspector_id: null,
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-02T00:00:00.000Z",
};

describe("mapMaintenanceRow", () => {
	it("maps a valid maintenance row to the MaintenanceRequest shape", () => {
		const mapped = mapMaintenanceRow(validRow);
		expect(mapped.id).toBe("00000000-0000-0000-0000-000000000001");
		expect(mapped.title).toBe("Leaky faucet");
		expect(mapped.description).toBe("Kitchen faucet drips continuously");
		expect(mapped.priority).toBe("high");
		expect(mapped.status).toBe("open");
		// Nullable-in-DB fields stay nullable, not over-validated into throws.
		expect(mapped.scheduled_date).toBeNull();
		expect(mapped.completed_at).toBeNull();
		expect(mapped.vendor_id).toBeNull();
	});

	it("throws when the NOT-NULL id is missing", () => {
		const { id: _omitId, ...withoutId } = validRow;
		expect(() => mapMaintenanceRow(withoutId)).toThrow(/id/);
	});

	it("throws when the NOT-NULL title is missing", () => {
		const { title: _omitTitle, ...withoutTitle } = validRow;
		expect(() => mapMaintenanceRow(withoutTitle)).toThrow(/title/);
	});

	it("rejects an unrecognized status enum", () => {
		expect(() => mapMaintenanceRow({ ...validRow, status: "bogus" })).toThrow(
			/status/,
		);
	});

	it("rejects an unrecognized priority enum", () => {
		expect(() =>
			mapMaintenanceRow({ ...validRow, priority: "extreme" }),
		).toThrow(/priority/);
	});

	it("accepts status='assigned' (set from the kanban or StatusSelect)", () => {
		const mapped = mapMaintenanceRow({ ...validRow, status: "assigned" });
		expect(mapped.status).toBe("assigned");
	});

	it("accepts status='needs_reassignment' (set from the kanban or StatusSelect)", () => {
		const mapped = mapMaintenanceRow({
			...validRow,
			status: "needs_reassignment",
		});
		expect(mapped.status).toBe("needs_reassignment");
	});

	it("accepts the remaining DB-CHECK statuses (in_progress, completed, cancelled, on_hold)", () => {
		for (const status of ["in_progress", "completed", "cancelled", "on_hold"]) {
			expect(mapMaintenanceRow({ ...validRow, status }).status).toBe(status);
		}
	});

	it("throws when status is absent (unconditional safeParse — no != null short-circuit)", () => {
		const { status: _omitStatus, ...withoutStatus } = validRow;
		expect(() => mapMaintenanceRow(withoutStatus)).toThrow(/status/);
	});

	it("throws when status is null (unconditional safeParse)", () => {
		expect(() => mapMaintenanceRow({ ...validRow, status: null })).toThrow(
			/status/,
		);
	});

	it("ignores the list's `units` embed key", () => {
		const mapped = mapMaintenanceRow({
			...validRow,
			units: { property_id: "00000000-0000-0000-0000-0000000000aa" },
		});
		expect(mapped.id).toBe("00000000-0000-0000-0000-000000000001");
		expect("units" in mapped).toBe(false);
	});

	// actual_cost is written by nothing, so the select list does not ask for it
	// and the row copies none, even from a row that carries one (66.2-39 part P).
	it("carries no actual_cost", () => {
		const mapped = mapMaintenanceRow({ ...validRow, actual_cost: 125.5 });
		expect(mapped).not.toHaveProperty("actual_cost");
	});

	it("ignores any other embed key (a `vendors` one)", () => {
		const mapped = mapMaintenanceRow({
			...validRow,
			vendors: { id: "v1", name: "Acme Plumbing", trade: "plumbing" },
		});
		expect(mapped.id).toBe("00000000-0000-0000-0000-000000000001");
		expect("vendors" in mapped).toBe(false);
	});

	it("passes populated nullable fields through unchanged", () => {
		const mapped = mapMaintenanceRow({
			...validRow,
			estimated_cost: 100,
			scheduled_date: "2026-02-01",
			completed_at: "2026-02-03T12:00:00.000Z",
			vendor_id: "00000000-0000-0000-0000-0000000000bb",
		});
		expect(mapped.estimated_cost).toBe(100);
		expect(mapped.scheduled_date).toBe("2026-02-01");
		expect(mapped.completed_at).toBe("2026-02-03T12:00:00.000Z");
		expect(mapped.vendor_id).toBe("00000000-0000-0000-0000-0000000000bb");
	});

	it("surfaces a descriptive boundary error message on status drift", () => {
		expect(() => mapMaintenanceRow({ ...validRow, status: "bogus" })).toThrow(
			expect.objectContaining({
				message: expect.stringContaining("mapMaintenanceRow"),
			}),
		);
	});
});

/**
 * The list names each request from its own embeds (66.2-39 fix round 3, part
 * 6c). Its rows carried none, so every board card printed "Unknown Property ·
 * Unit <the unit's id>" and every table row "Unassigned".
 */
describe("mapMaintenanceListRow", () => {
	const listRow = {
		...validRow,
		units: {
			unit_number: "4B",
			property_id: "00000000-0000-0000-0000-0000000000aa",
			properties: { name: "Maple Court", status: "active" },
		},
		tenant: { name: "Dana Rivera", first_name: "Dana", last_name: "Rivera" },
	};

	it("names the request's property, unit and tenant from the embeds", () => {
		const mapped = mapMaintenanceListRow(listRow);
		expect(mapped.propertyName).toBe("Maple Court");
		expect(mapped.unitNumber).toBe("4B");
		expect(mapped.tenantName).toBe("Dana Rivera");
		expect(mapped.unit_id).toBe(validRow.unit_id);
		expect(mapped).not.toHaveProperty("units");
		expect(mapped).not.toHaveProperty("tenant");
	});

	it("names a property the owner deleted as a report does", () => {
		const mapped = mapMaintenanceListRow({
			...listRow,
			units: {
				...listRow.units,
				properties: { name: "Gamma Flats", status: "inactive" },
			},
		});
		expect(mapped.propertyName).toBe("Gamma Flats (deleted)");
	});

	it("falls back to the tenant's first and last name", () => {
		expect(
			mapMaintenanceListRow({
				...listRow,
				tenant: { name: null, first_name: "Dana", last_name: null },
			}).tenantName,
		).toBe("Dana");
		expect(
			mapMaintenanceListRow({
				...listRow,
				tenant: { name: "", first_name: null, last_name: null },
			}).tenantName,
		).toBeNull();
	});

	it("names nothing, never an id, for a unit or tenant row it cannot see", () => {
		const mapped = mapMaintenanceListRow({
			...listRow,
			units: null,
			tenant: null,
		});
		expect(mapped.propertyName).toBeNull();
		expect(mapped.unitNumber).toBeNull();
		expect(mapped.tenantName).toBeNull();
	});

	it("keeps a unit without a number unnumbered", () => {
		const mapped = mapMaintenanceListRow({
			...listRow,
			units: { ...listRow.units, unit_number: null },
		});
		expect(mapped.unitNumber).toBeNull();
		expect(mapped.propertyName).toBe("Maple Court");
	});

	it("throws when the select dropped an embed", () => {
		const { units: _omitUnits, ...withoutUnits } = listRow;
		expect(() => mapMaintenanceListRow(withoutUnits)).toThrow(/units/);
		const { tenant: _omitTenant, ...withoutTenant } = listRow;
		expect(() => mapMaintenanceListRow(withoutTenant)).toThrow(/tenant/);
		expect(() =>
			mapMaintenanceListRow({
				...listRow,
				units: { unit_number: "4B", property_id: "p" },
			}),
		).toThrow(/properties/);
	});

	it("throws on a to-many embed shape and on a property without its name", () => {
		expect(() =>
			mapMaintenanceListRow({ ...listRow, units: [listRow.units] }),
		).toThrow(/single row/);
		expect(() =>
			mapMaintenanceListRow({
				...listRow,
				units: { ...listRow.units, properties: { status: "active" } },
			}),
		).toThrow(/name/);
	});
});

describe("mapMaintenanceDetailRow", () => {
	it("names the unit and property from the unit embed alone", () => {
		const mapped = mapMaintenanceDetailRow({
			...validRow,
			units: {
				unit_number: "2B",
				property_id: "00000000-0000-0000-0000-0000000000aa",
				properties: { name: "Gamma Flats", status: "inactive" },
			},
		});
		expect(mapped.propertyName).toBe("Gamma Flats (deleted)");
		expect(mapped.unitNumber).toBe("2B");
		expect(mapped).not.toHaveProperty("tenantName");
		expect(mapped).not.toHaveProperty("units");
	});

	it("throws when the select dropped the unit embed", () => {
		expect(() => mapMaintenanceDetailRow(validRow)).toThrow(/units/);
	});
});
