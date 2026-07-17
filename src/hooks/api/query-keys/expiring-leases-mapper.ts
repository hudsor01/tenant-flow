/**
 * Boundary mapper for the expiring-leases dashboard widget (TYPE-03, Phase 2).
 *
 * `expiring-leases-widget.tsx` reads a nested PostgREST FK join off `leases`
 * (`tenants:primary_tenant_id (name)`, `units:unit_id (unit_number,
 * properties:property_id (name))`). The old path projected those raw rows via
 * an inline untyped `.map()` (`row.tenants?.name`, `row.units?.properties?.name`)
 * — not field-validated, so a dropped column in the `.select(...)` read as
 * `undefined` silently instead of failing at the boundary.
 *
 * `mapExpiringLeaseRow` replaces that inline projection with a Zod `safeParse`
 * field-validation, mirroring `mapDocumentRow` in
 * `src/hooks/api/query-keys/document-keys.ts` (the canonical reference CLAUDE.md
 * cites for the "RPC / PostgREST Return Typing" rule — typed mapper at every
 * boundary, never `as unknown as`).
 *
 * Discipline mirrored from `mapDocumentRow`:
 *  - NOT-NULL fields (`id`, `end_date`, `rent_amount`) throw if missing or the
 *    wrong type — a dropped column surfaces immediately instead of silently
 *    producing `undefined`.
 *  - Nullable-in-DB joins (`tenants`, `units`, `units.properties`) stay nullable
 *    — an absent join legitimately maps to `null`, no throw.
 */

import { z } from "zod";

export interface ExpiringLeaseRow {
	id: string;
	end_date: string;
	rent_amount: number;
	tenant_name: string | null;
	unit_name: string | null;
	property_name: string | null;
}

// The raw nested PostgREST join shape. NOT-NULL columns (id/end_date/
// rent_amount) are required; the FK joins are nullable (a lease may have no
// primary tenant / unit, and a unit may have no property row). Nested name
// fields are nullable to match real column nullability.
const expiringLeaseRawSchema = z.object({
	id: z.string(),
	end_date: z.string(),
	rent_amount: z.number(),
	tenants: z.object({ name: z.string().nullable() }).nullable().optional(),
	units: z
		.object({
			unit_number: z.string().nullable(),
			properties: z
				.object({ name: z.string().nullable() })
				.nullable()
				.optional(),
		})
		.nullable()
		.optional(),
});

/**
 * Maps one raw expiring-lease join row into the flat `ExpiringLeaseRow` the
 * widget renders. Throws on a missing/typed-wrong NOT-NULL field (boundary
 * surfaces RPC drift loudly); maps absent joins to `null`.
 */
export function mapExpiringLeaseRow(raw: unknown): ExpiringLeaseRow {
	const parsed = expiringLeaseRawSchema.safeParse(raw);
	if (!parsed.success) {
		const firstIssue = parsed.error.issues[0];
		const path = firstIssue?.path.join(".") || "<root>";
		throw new Error(
			`mapExpiringLeaseRow: invalid expiring-lease row at '${path}' — ${firstIssue?.message ?? "validation failed"}`,
		);
	}

	const { id, end_date, rent_amount, tenants, units } = parsed.data;
	return {
		id,
		end_date,
		rent_amount,
		tenant_name: tenants?.name ?? null,
		unit_name: units?.unit_number ?? null,
		property_name: units?.properties?.name ?? null,
	};
}
