/**
 * Maintenance Row Mapper (TYPE-02, Phase 2 — typed RPC/PostgREST boundaries).
 *
 * `mapMaintenanceRow` maps a `maintenance_requests` PostgREST row into the
 * strictly-typed `MaintenanceRequest` (#types/core: the table's row without
 * `actual_cost`, which nothing reads), field-validating at the boundary. Mirrors `mapDocumentRow` in
 * `document-keys.ts` (CLAUDE.md's cited reference for the "RPC / PostgREST
 * Return Typing" rule): `requireString` throws on a missing NOT-NULL column so
 * a dropped `.select(...)` field surfaces immediately rather than silently
 * producing `"undefined"` downstream (broken React keys, kanban grouping,
 * detail-page lookups). `status` and `priority` are validated via Zod
 * `safeParse` so an enum drift fails loudly instead of leaking. Nullable-in-DB
 * fields stay nullable — they are not over-validated into false throws.
 *
 * Extracted as a co-located mapper (tenant-mappers.ts precedent) rather than
 * inlined in maintenance-keys.ts, which is already near the 300-line cap.
 */

import { z } from "zod";
import { DiagnosticError } from "#lib/diagnostic-error";
import { maintenancePrioritySchema } from "#lib/validation/maintenance";
import type { MaintenanceRequest } from "#types/core";
import { propertyReportName } from "../../../../supabase/functions/_shared/tax-year-reports";

// PERSISTED maintenance status set — the FULL live DB CHECK constraint from
// migration 20260221120000_add_maintenance_status_vendor_statuses.sql (the
// source of truth; no later override widens or narrows it):
//   open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold
//
// This is a module-local schema kept separate from the shared
// `maintenanceStatusSchema` in #lib/validation/maintenance so the two boundaries
// stay independent: this one validates PERSISTED rows read back from the DB
// (list()/detail()), while the shared schema validates
// form/mutation INPUT. Both now enumerate the same 7 values — Phase 27 (MAINT-06)
// widened the shared schema to include "assigned" and "needs_reassignment"
// because the kanban drag + detail StatusSelect let an owner set those
// vendor-workflow statuses through the general update mutation. Keep this
// local copy anyway: it decouples
// the read-side defensive validation from any future narrowing of the input
// schema, mirroring plan 02-02's tenant `moved_out` persisted-status precedent.
const maintenancePersistedStatusSchema = z.enum([
	"open",
	"assigned",
	"in_progress",
	"needs_reassignment",
	"completed",
	"cancelled",
	"on_hold",
]);

/**
 * Throw on a missing/non-string NOT-NULL field. Mirrors the `requireString`
 * helper in `mapDocumentRow` — surfaces a dropped column at the boundary.
 */
function requireString(raw: Record<string, unknown>, field: string): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new DiagnosticError(
			`mapMaintenanceRow: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}

/**
 * Validate a PERSISTED maintenance `status` against the full 7-value DB CHECK
 * set. `status` is NOT NULL in the DB, so an absent/null value is itself drift —
 * the safeParse runs UNCONDITIONALLY (no `!= null` short-circuit), so a dropped
 * NOT-NULL status column throws here instead of leaking through as `undefined`.
 */
function requirePersistedStatus(value: unknown): string {
	const parsed = maintenancePersistedStatusSchema.safeParse(value);
	if (!parsed.success) {
		throw new DiagnosticError(
			`mapMaintenanceRow: invalid status '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/**
 * Validate a PERSISTED maintenance `priority` against the 5-value DB enum
 * (reused `maintenancePrioritySchema` — it matches the DB CHECK exactly).
 * `priority` is NOT NULL, so the safeParse runs unconditionally.
 */
function requirePersistedPriority(value: unknown): string {
	const parsed = maintenancePrioritySchema.safeParse(value);
	if (!parsed.success) {
		throw new DiagnosticError(
			`mapMaintenanceRow: invalid priority '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/**
 * Map a `maintenance_requests` PostgREST row to the strictly-typed
 * `MaintenanceRequest`. Accepts a row that carries the list's or the detail's
 * `units` and `tenant` embeds (which `mapMaintenanceListRow` and
 * `mapMaintenanceDetailRow` read): only the maintenance_requests columns are
 * read, so the embed keys never appear on the output.
 */
export function mapMaintenanceRow(raw: unknown): MaintenanceRequest {
	const row = (raw ?? {}) as Record<string, unknown>;
	return {
		// NOT-NULL columns — throw if a dropped .select() column made them absent.
		id: requireString(row, "id"),
		owner_user_id: requireString(row, "owner_user_id"),
		unit_id: requireString(row, "unit_id"),
		tenant_id: requireString(row, "tenant_id"),
		title: requireString(row, "title"),
		description: requireString(row, "description"),
		priority: requirePersistedPriority(row.priority),
		status: requirePersistedStatus(row.status),
		// Nullable-in-DB columns — pass through as value-or-null.
		vendor_id: (row.vendor_id as string | null) ?? null,
		requested_by: (row.requested_by as string | null) ?? null,
		assigned_to: (row.assigned_to as string | null) ?? null,
		estimated_cost: (row.estimated_cost as number | null) ?? null,
		scheduled_date: (row.scheduled_date as string | null) ?? null,
		completed_at: (row.completed_at as string | null) ?? null,
		inspection_date: (row.inspection_date as string | null) ?? null,
		inspection_findings: (row.inspection_findings as string | null) ?? null,
		inspector_id: (row.inspector_id as string | null) ?? null,
		created_at: (row.created_at as string | null) ?? null,
		updated_at: (row.updated_at as string | null) ?? null,
	};
}

/**
 * A maintenance request as the list (the board, the table and its search)
 * shows it: the row and the names of what it is for, from the request's own
 * embeds (`units(unit_number, property_id, properties(name, status))`,
 * `tenant:tenant_id(name, first_name, last_name)` and
 * `vendor:vendor_id(name)`). A request is never shown by its unit's id.
 */
export interface MaintenanceListRow extends MaintenanceRequest {
	/**
	 * As a report prints it (`propertyReportName`): "Gamma Flats (deleted)"
	 * for a property the owner deleted; null with no property row.
	 */
	propertyName: string | null;
	/** The unit's number; null when it has none, or with no unit row. */
	unitNumber: string | null;
	/** The tenant's name, else first and last; null with neither or no row. */
	tenantName: string | null;
	/** The assigned vendor's name; null with no vendor. */
	vendorName: string | null;
}

/**
 * A maintenance request as its detail page shows it: what the list shows, how
 * to reach the tenant who has it (the tenant embed's `email` and `phone`) and
 * the assigned vendor's trade and contact details (the vendor embed's `trade`,
 * `phone` and `email`; all null with no vendor).
 */
export interface MaintenanceDetailRow extends MaintenanceListRow {
	tenantEmail: string | null;
	tenantPhone: string | null;
	vendorTrade: string | null;
	vendorPhone: string | null;
	vendorEmail: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown, field: string): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value !== "string") {
		throw new DiagnosticError(
			`maintenance row: '${field}' is not a string in the PostgREST response`,
		);
	}
	return value;
}

/**
 * A to-one embed: its object, or null when no row is visible. The key itself
 * must be there: an absent one means the select dropped the embed, and every
 * request would be shown without its names, so it throws instead.
 */
function toOneEmbed(
	row: Record<string, unknown>,
	key: string,
): Record<string, unknown> | null {
	if (!(key in row)) {
		throw new DiagnosticError(
			`maintenance row: embed '${key}' missing from PostgREST response`,
		);
	}
	const value = row[key];
	if (value === null) return null;
	if (!isRecord(value)) {
		throw new DiagnosticError(
			`maintenance row: embed '${key}' is not a single row in the PostgREST response`,
		);
	}
	return value;
}

function tenantDisplayName(tenant: Record<string, unknown>): string | null {
	const name = nullableString(tenant.name, "tenant.name");
	if (name) return name;
	const full = [
		nullableString(tenant.first_name, "tenant.first_name"),
		nullableString(tenant.last_name, "tenant.last_name"),
	]
		.filter((part): part is string => !!part)
		.join(" ")
		.trim();
	return full === "" ? null : full;
}

/**
 * Map a row of the maintenance list: the request's columns through
 * `mapMaintenanceRow`, then its unit's number, its property's name, its
 * tenant's name and its vendor's name from the embeds.
 */
export function mapMaintenanceListRow(raw: unknown): MaintenanceListRow {
	const row = isRecord(raw) ? raw : {};
	const unit = toOneEmbed(row, "units");
	const property = unit === null ? null : toOneEmbed(unit, "properties");
	const tenant = toOneEmbed(row, "tenant");
	const vendor = toOneEmbed(row, "vendor");
	return {
		...mapMaintenanceRow(row),
		propertyName:
			property === null
				? null
				: propertyReportName(
						requireString(property, "name"),
						requireString(property, "status"),
					),
		unitNumber:
			unit === null ? null : nullableString(unit.unit_number, "unit_number"),
		tenantName: tenant === null ? null : tenantDisplayName(tenant),
		vendorName: vendor === null ? null : requireString(vendor, "name"),
	};
}

/**
 * Map a request on its detail page: the list's row, the tenant's email and
 * phone from the tenant embed, and the vendor's trade, phone and email from
 * the vendor embed.
 */
export function mapMaintenanceDetailRow(raw: unknown): MaintenanceDetailRow {
	const row = isRecord(raw) ? raw : {};
	const tenant = toOneEmbed(row, "tenant");
	const vendor = toOneEmbed(row, "vendor");
	return {
		...mapMaintenanceListRow(row),
		tenantEmail:
			tenant === null ? null : nullableString(tenant.email, "tenant.email"),
		tenantPhone:
			tenant === null ? null : nullableString(tenant.phone, "tenant.phone"),
		vendorTrade: vendor === null ? null : requireString(vendor, "trade"),
		vendorPhone:
			vendor === null ? null : nullableString(vendor.phone, "vendor.phone"),
		vendorEmail:
			vendor === null ? null : nullableString(vendor.email, "vendor.email"),
	};
}
