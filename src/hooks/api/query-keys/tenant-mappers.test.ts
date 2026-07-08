/**
 * Unit tests for the tenant boundary mappers (TYPE-02, Phase 2).
 *
 * `mapTenantBaseRow` validates a flat `tenants` insert/update return
 * (`.select().single()`) at the PostgREST boundary, and the upgraded
 * `mapTenantRow` validates the nested-join read shape. Both mirror
 * `mapDocumentRow` in `document-keys.ts` (CLAUDE.md's cited reference):
 * `requireString` throws on a missing NOT-NULL `id`, `status` is validated
 * via Zod `safeParse`, and nullable-in-DB fields stay nullable.
 *
 * These tests pin the happy path (valid row maps through), the drift path
 * (a dropped NOT-NULL `id` or a bogus `status` enum fails loudly at the
 * boundary instead of leaking downstream), and the `moved_out` carve-out
 * (markMovedOut persists a status that is in TENANT_ACTIVE_STATUSES but not
 * tenantStatusSchema, so the persisted-status union must accept it).
 */

import { describe, expect, it } from "vitest";
import {
	mapTenantBaseRow,
	mapTenantRow,
	type TenantPostgrestRow,
} from "./tenant-mappers";

const validBaseRow = {
	id: "00000000-0000-0000-0000-000000000001",
	owner_user_id: "00000000-0000-0000-0000-0000000000ff",
	first_name: "Jordan",
	last_name: "Lee",
	name: "Jordan Lee",
	email: "jordan@example.com",
	phone: null,
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-02T00:00:00.000Z",
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
};

const minimalNestedRow: TenantPostgrestRow = {
	id: "00000000-0000-0000-0000-000000000002",
	owner_user_id: "00000000-0000-0000-0000-0000000000ff",
	first_name: "Sam",
	last_name: "Rivera",
	name: null,
	email: "sam@example.com",
	phone: null,
	status: "active",
	created_at: "2026-01-01T00:00:00.000Z",
	updated_at: "2026-01-02T00:00:00.000Z",
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
};

describe("mapTenantBaseRow", () => {
	it("maps a valid flat tenants row to the Tenant shape", () => {
		const mapped = mapTenantBaseRow(validBaseRow);
		expect(mapped.id).toBe("00000000-0000-0000-0000-000000000001");
		expect(mapped.status).toBe("active");
		expect(mapped.email).toBe("jordan@example.com");
		// Nullable-in-DB fields stay nullable, not over-validated into throws.
		expect(mapped.phone).toBeNull();
		expect(mapped.identity_verified).toBeNull();
	});

	it("throws when the NOT-NULL id is missing", () => {
		const { id: _omitId, ...withoutId } = validBaseRow;
		expect(() => mapTenantBaseRow(withoutId)).toThrow(/id/);
	});

	it("throws when status is not in the accepted union", () => {
		expect(() =>
			mapTenantBaseRow({ ...validBaseRow, status: "bogus_status" }),
		).toThrow(/status/);
	});

	it("accepts status='moved_out' (in TENANT_ACTIVE_STATUSES)", () => {
		const mapped = mapTenantBaseRow({ ...validBaseRow, status: "moved_out" });
		expect(mapped.status).toBe("moved_out");
	});

	it("accepts the system statuses SUSPENDED and DELETED", () => {
		expect(
			mapTenantBaseRow({ ...validBaseRow, status: "SUSPENDED" }).status,
		).toBe("SUSPENDED");
		expect(
			mapTenantBaseRow({ ...validBaseRow, status: "DELETED" }).status,
		).toBe("DELETED");
	});
});

describe("mapTenantRow", () => {
	it("maps a minimal valid nested row to TenantWithLeaseInfo", () => {
		const mapped = mapTenantRow(minimalNestedRow);
		expect(mapped.id).toBe("00000000-0000-0000-0000-000000000002");
		expect(mapped.status).toBe("active");
		expect(mapped.email).toBe("sam@example.com");
		expect(mapped.currentLease).toBeNull();
	});

	it("defaults a null status to 'active'", () => {
		const mapped = mapTenantRow({ ...minimalNestedRow, status: null });
		expect(mapped.status).toBe("active");
	});

	it("throws when the NOT-NULL id is missing", () => {
		// mapTenantRow accepts the nested-join shape; force a dropped NOT-NULL
		// id via a plain `as` over a partial row (not `as unknown as`, which the
		// TYPE-03 drift guard forbids under src/hooks/api/**).
		const { id: _omitId, ...withoutId } = minimalNestedRow;
		expect(() =>
			mapTenantRow(
				withoutId as Partial<TenantPostgrestRow> as TenantPostgrestRow,
			),
		).toThrow(/id/);
	});

	it("throws when a non-null status is not in the accepted union", () => {
		expect(() =>
			mapTenantRow({ ...minimalNestedRow, status: "bogus_status" }),
		).toThrow(/status/);
	});
});

// --- TEN-04: current-lease selection prefers the active lease ---

type LeaseTenantFixture = NonNullable<
	TenantPostgrestRow["lease_tenants"]
>[number];

function makeLeaseTenant(opts: {
	leaseId: string;
	leaseStatus: string;
	startDate: string;
	isPrimary: boolean;
}): LeaseTenantFixture {
	return {
		lease_id: opts.leaseId,
		is_primary: opts.isPrimary,
		leases: {
			id: opts.leaseId,
			lease_status: opts.leaseStatus,
			start_date: opts.startDate,
			end_date: "2027-01-01",
			rent_amount: 1500,
			security_deposit: 1500,
			unit_id: `unit-${opts.leaseId}`,
			primary_tenant_id: minimalNestedRow.id,
			owner_user_id: minimalNestedRow.owner_user_id ?? "owner",
			units: {
				id: `unit-${opts.leaseId}`,
				unit_number: `U-${opts.leaseId}`,
				bedrooms: 2,
				bathrooms: 1,
				square_feet: 800,
				rent_amount: 1500,
				property_id: `prop-${opts.leaseId}`,
				properties: {
					id: `prop-${opts.leaseId}`,
					name: `Property ${opts.leaseId}`,
					address_line1: `${opts.leaseId} Main St`,
					address_line2: null,
					city: "Dallas",
					state: "TX",
					postal_code: "75001",
				},
			},
		},
	};
}

describe("mapTenantRow current-lease selection (TEN-04)", () => {
	it("prefers a separate active lease over a terminated is_primary lease", () => {
		const row: TenantPostgrestRow = {
			...minimalNestedRow,
			lease_tenants: [
				makeLeaseTenant({
					leaseId: "terminated-primary",
					leaseStatus: "terminated",
					startDate: "2025-01-01",
					isPrimary: true,
				}),
				makeLeaseTenant({
					leaseId: "active-secondary",
					leaseStatus: "active",
					startDate: "2024-06-01",
					isPrimary: false,
				}),
			],
		};
		const mapped = mapTenantRow(row);
		expect(mapped.currentLease?.id).toBe("active-secondary");
		expect(mapped.currentLease?.status).toBe("active");
		expect(mapped.lease_status).toBe("active");
		expect(mapped.unit?.id).toBe("unit-active-secondary");
		expect(mapped.property?.id).toBe("prop-active-secondary");
	});

	it("falls back to the is_primary lease when none are active", () => {
		const row: TenantPostgrestRow = {
			...minimalNestedRow,
			lease_tenants: [
				makeLeaseTenant({
					leaseId: "terminated-secondary",
					leaseStatus: "terminated",
					startDate: "2025-05-01",
					isPrimary: false,
				}),
				makeLeaseTenant({
					leaseId: "terminated-primary",
					leaseStatus: "terminated",
					startDate: "2024-01-01",
					isPrimary: true,
				}),
			],
		};
		const mapped = mapTenantRow(row);
		expect(mapped.currentLease?.id).toBe("terminated-primary");
		expect(mapped.lease_status).toBe("terminated");
	});

	it("tie-breaks between two active leases by latest start_date", () => {
		const row: TenantPostgrestRow = {
			...minimalNestedRow,
			lease_tenants: [
				makeLeaseTenant({
					leaseId: "active-older",
					leaseStatus: "active",
					startDate: "2024-01-01",
					isPrimary: false,
				}),
				makeLeaseTenant({
					leaseId: "active-newer",
					leaseStatus: "active",
					startDate: "2025-11-01",
					isPrimary: false,
				}),
			],
		};
		const mapped = mapTenantRow(row);
		expect(mapped.currentLease?.id).toBe("active-newer");
		expect(mapped.lease_status).toBe("active");
	});

	it("returns a null currentLease when there are no lease_tenants", () => {
		const mapped = mapTenantRow({ ...minimalNestedRow, lease_tenants: [] });
		expect(mapped.currentLease).toBeNull();
		expect(mapped.unit).toBeNull();
		expect(mapped.property).toBeNull();
		expect(mapped.lease_status).toBeUndefined();
	});
});
