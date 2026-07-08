/**
 * Maintenance Row Mapper (TYPE-02, Phase 2 — typed RPC/PostgREST boundaries).
 *
 * `mapMaintenanceRow` maps a `maintenance_requests` PostgREST row into the
 * strictly-typed `MaintenanceRequest` (= Tables<"maintenance_requests">),
 * field-validating at the boundary. Mirrors `mapDocumentRow` in
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
import { maintenancePrioritySchema } from "#lib/validation/maintenance";
import type { MaintenanceRequest } from "#types/core";

// PERSISTED maintenance status set — the FULL live DB CHECK constraint from
// migration 20260221120000_add_maintenance_status_vendor_statuses.sql (the
// source of truth; no later override widens or narrows it):
//   open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold
//
// This is a module-local schema kept separate from the shared
// `maintenanceStatusSchema` in #lib/validation/maintenance so the two boundaries
// stay independent: this one validates PERSISTED rows read back from the DB
// (list()/detail()/urgent()/overdue()), while the shared schema validates
// form/mutation INPUT. Both now enumerate the same 7 values — Phase 27 (MAINT-06)
// widened the shared schema to include "assigned" and "needs_reassignment"
// because the kanban drag + detail StatusSelect now let an owner set those
// vendor-workflow statuses through the general update mutation (in addition to
// vendorMutations.assign / unassign). Keep this local copy anyway: it decouples
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
		throw new Error(
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
		throw new Error(
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
		throw new Error(
			`mapMaintenanceRow: invalid priority '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/**
 * Map a `maintenance_requests` PostgREST row to the strictly-typed
 * `MaintenanceRequest`. Accepts a row that may carry an extra `units` (from the
 * list() property_id `units!inner(property_id)` embed) or `vendors` (from the
 * detail() `vendors(...)` embed) key — only the maintenance_requests columns are
 * read, so the embed keys are ignored and never appear on the output.
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
		actual_cost: (row.actual_cost as number | null) ?? null,
		scheduled_date: (row.scheduled_date as string | null) ?? null,
		completed_at: (row.completed_at as string | null) ?? null,
		inspection_date: (row.inspection_date as string | null) ?? null,
		inspection_findings: (row.inspection_findings as string | null) ?? null,
		inspector_id: (row.inspector_id as string | null) ?? null,
		created_at: (row.created_at as string | null) ?? null,
		updated_at: (row.updated_at as string | null) ?? null,
	};
}
