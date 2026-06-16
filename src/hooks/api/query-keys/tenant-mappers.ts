/**
 * Tenant Row Mappers (TYPE-02, Phase 2 — typed RPC/PostgREST boundaries).
 *
 * `mapTenantBaseRow` maps a flat `tenants` insert/update return
 * (`.select().single()`); `mapTenantRow` maps the nested-join read shape
 * (with lease_tenants joins) to `TenantWithLeaseInfo`.
 *
 * Both field-validate at the boundary, mirroring `mapDocumentRow` in
 * `document-keys.ts` (CLAUDE.md's cited reference for the "RPC / PostgREST
 * Return Typing" rule). NOT-NULL `id` throws if absent — the boundary should
 * surface a dropped `.select()` column immediately rather than silently
 * producing `"undefined"` downstream (broken React keys, signed-URL targets,
 * detail-page lookups). `status` is validated via Zod `safeParse` against the
 * accepted-status union so an enum drift fails loudly instead of leaking.
 * Nullable-in-DB fields (owner_user_id, email, name, etc.) stay nullable —
 * they're not over-validated into false throws.
 *
 * Extracted from tenant-keys.ts for maintainability.
 */

import { z } from "zod";
import {
	TENANT_ACTIVE_STATUSES,
	tenantStatusSchema,
} from "#lib/validation/tenants";
import type { Tenant, TenantWithLeaseInfo } from "#types/core";

// Statuses that may legitimately be PERSISTED on a tenants row. This is the
// union of `tenantStatusSchema` (active/inactive/pending/SUSPENDED/DELETED)
// and `TENANT_ACTIVE_STATUSES` (which adds `moved_out`, set by markMovedOut
// but absent from tenantStatusSchema). REUSE both — do not redefine the enum.
// `z.enum` requires a non-empty literal tuple, so de-dupe into an array first.
const PERSISTED_TENANT_STATUSES = [
	...new Set<string>([
		...tenantStatusSchema.options,
		...TENANT_ACTIVE_STATUSES,
	]),
] as [string, ...string[]];

const tenantPersistedStatusSchema = z.enum(PERSISTED_TENANT_STATUSES);

/**
 * Throw on a missing/non-string NOT-NULL field. Mirrors the `requireString`
 * helper in `mapDocumentRow` — surfaces a dropped column at the boundary.
 */
function requireString(
	raw: Record<string, unknown>,
	field: string,
	mapper: string,
): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new Error(
			`${mapper}: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}

/**
 * Validate a persisted tenant `status` against the accepted-status union.
 * Throws a descriptive boundary error on drift. `status` is NOT NULL in the
 * DB, so a missing value is itself drift.
 */
function requireTenantStatus(value: unknown, mapper: string): string {
	const parsed = tenantPersistedStatusSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error(
			`${mapper}: invalid 'status' value '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/**
 * Map a flat `tenants` row (the `.select().single()` insert/update return)
 * into the strictly-typed `Tenant` (= Tables<"tenants">). Validates the
 * NOT-NULL `id` + `status`; passes nullable columns through as value-or-null.
 */
export function mapTenantBaseRow(raw: unknown): Tenant {
	const row = (raw ?? {}) as Record<string, unknown>;
	return {
		id: requireString(row, "id", "mapTenantBaseRow"),
		status: requireTenantStatus(row.status, "mapTenantBaseRow"),
		owner_user_id: (row.owner_user_id as string | null) ?? null,
		first_name: (row.first_name as string | null) ?? null,
		last_name: (row.last_name as string | null) ?? null,
		name: (row.name as string | null) ?? null,
		email: (row.email as string | null) ?? null,
		phone: (row.phone as string | null) ?? null,
		date_of_birth: (row.date_of_birth as string | null) ?? null,
		emergency_contact_name:
			(row.emergency_contact_name as string | null) ?? null,
		emergency_contact_phone:
			(row.emergency_contact_phone as string | null) ?? null,
		emergency_contact_relationship:
			(row.emergency_contact_relationship as string | null) ?? null,
		identity_verified: (row.identity_verified as boolean | null) ?? null,
		ssn_last_four: (row.ssn_last_four as string | null) ?? null,
		created_at: (row.created_at as string | null) ?? null,
		updated_at: (row.updated_at as string | null) ?? null,
	};
}

export interface TenantPostgrestRow {
	id: string;
	owner_user_id: string | null;
	first_name: string | null;
	last_name: string | null;
	name: string | null;
	email: string | null;
	phone: string | null;
	status: string | null;
	created_at: string | null;
	updated_at: string | null;
	date_of_birth: string | null;
	emergency_contact_name: string | null;
	emergency_contact_phone: string | null;
	emergency_contact_relationship: string | null;
	identity_verified: boolean | null;
	ssn_last_four: string | null;
	lease_tenants?: Array<{
		lease_id: string;
		is_primary: boolean | null;
		leases: {
			id: string;
			lease_status: string;
			start_date: string;
			end_date: string;
			rent_amount: number;
			security_deposit: number;
			unit_id: string;
			primary_tenant_id: string;
			owner_user_id: string;
			units: {
				id: string;
				unit_number: string | null;
				bedrooms: number | null;
				bathrooms: number | null;
				square_feet: number | null;
				rent_amount: number;
				property_id: string;
				properties: {
					id: string;
					name: string;
					address_line1: string;
					address_line2: string | null;
					city: string;
					state: string;
					postal_code: string;
				} | null;
			} | null;
		} | null;
	}>;
}

export function mapTenantRow(row: TenantPostgrestRow): TenantWithLeaseInfo {
	// Validate the NOT-NULL id + the persisted status BEFORE shaping, so a
	// dropped column or an enum drift fails loudly at the boundary instead of
	// leaking through the plain `as TenantWithLeaseInfo` below. `id` is typed
	// `string` on TenantPostgrestRow but the PostgREST response is untyped at
	// runtime, so re-check it. The null-status branch keeps the historical
	// `?? "active"` default (status is NOT NULL in the DB, but the nested-join
	// select can legally observe a NULL during transitional states); a
	// non-null status must be a recognized value.
	if (typeof row.id !== "string") {
		throw new Error(
			"mapTenantRow: NOT NULL field 'id' missing or non-string from PostgREST response",
		);
	}
	const id = row.id;
	const status =
		row.status == null
			? "active"
			: requireTenantStatus(row.status, "mapTenantRow");

	const leaseRows = row.lease_tenants ?? [];

	// Find the primary/active lease (prefer active, fallback to first)
	const primaryLeaseTenant =
		leaseRows.find((lt) => lt.is_primary) ?? leaseRows[0];
	const activeLease = primaryLeaseTenant?.leases ?? null;
	const activeUnit = activeLease?.units ?? null;
	const activeProperty = activeUnit?.properties ?? null;

	// Display fields come straight from the tenant's own columns. Landlord-
	// managed tenants are records, never auth users, so there is no linked
	// user to fall back to (LEGACY-TENANT-06 removed the dead user_id embed).
	const displayFirstName = row.first_name ?? null;
	const displayLastName = row.last_name ?? null;
	const displayPhone = row.phone ?? null;
	const displayEmail = row.email ?? null;
	const displayName =
		row.name ??
		(displayFirstName || displayLastName
			? `${displayFirstName ?? ""} ${displayLastName ?? ""}`.trim()
			: null);

	// Build base fields (required fields only, no optional undefined assignments)
	const base = {
		id,
		owner_user_id: row.owner_user_id,
		status,
		created_at: row.created_at,
		updated_at: row.updated_at,
		date_of_birth: row.date_of_birth,
		emergency_contact_name: row.emergency_contact_name,
		emergency_contact_phone: row.emergency_contact_phone,
		emergency_contact_relationship: row.emergency_contact_relationship,
		identity_verified: row.identity_verified,
		ssn_last_four: row.ssn_last_four,
		phone: displayPhone,
		first_name: displayFirstName,
		last_name: displayLastName,
		currentLease: activeLease
			? {
					id: activeLease.id,
					start_date: activeLease.start_date,
					end_date: activeLease.end_date,
					rent_amount: activeLease.rent_amount,
					security_deposit: activeLease.security_deposit,
					status: activeLease.lease_status,
					primary_tenant_id: activeLease.primary_tenant_id,
					unit_id: activeLease.unit_id,
				}
			: null,
		leases: leaseRows
			.filter((lt) => lt.leases !== null)
			.map((lt) => {
				const leaseProperty = lt.leases!.units?.properties;
				return {
					id: lt.leases!.id,
					start_date: lt.leases!.start_date,
					end_date: lt.leases!.end_date as string | null,
					rent_amount: lt.leases!.rent_amount,
					status: lt.leases!.lease_status,
					...(leaseProperty
						? {
								property: {
									address_line1: leaseProperty.address_line1,
								},
							}
						: {}),
				};
			}),
		unit: activeUnit
			? {
					id: activeUnit.id,
					unit_number: activeUnit.unit_number,
					bedrooms: activeUnit.bedrooms,
					bathrooms: activeUnit.bathrooms,
					square_feet: activeUnit.square_feet,
					rent_amount: activeUnit.rent_amount,
				}
			: null,
		property: activeProperty
			? {
					id: activeProperty.id,
					name: activeProperty.name,
					address_line1: activeProperty.address_line1,
					address_line2: activeProperty.address_line2 ?? null,
					city: activeProperty.city,
					state: activeProperty.state,
					postal_code: activeProperty.postal_code,
				}
			: null,
	};

	// Always include name/email as nullable, per TenantWithLeaseInfo shape.
	return {
		...base,
		name: displayName,
		email: displayEmail,
		...(activeLease ? { monthlyRent: activeLease.rent_amount } : {}),
		...(activeLease ? { lease_status: activeLease.lease_status } : {}),
		...(activeUnit?.unit_number ? { unitDisplay: activeUnit.unit_number } : {}),
		...(activeProperty ? { propertyDisplay: activeProperty.name } : {}),
	} as TenantWithLeaseInfo;
}
