/**
 * Tenant bulk-import configuration (v2.3 Phase 58 + audit follow-ups).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Encapsulates everything the
 * generic stepper needs to handle tenant CSV imports:
 *   - template headers + sample rows (used by the Download Template button)
 *   - parseAndValidate factory using a bulk-import-specific required schema
 *   - row-by-row PostgREST insert with owner_user_id attached
 *   - query keys to invalidate post-import
 */

import { z } from "zod";
import { parseCsvWithSchema } from "#components/bulk-import/parse-csv-with-schema";
import type { BulkImportConfig } from "#components/bulk-import/types";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { omitUndefined } from "#lib/db-insert";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { phoneSchema } from "#lib/validation/common";
import {
	TENANT_ACTIVE_STATUSES,
	type TenantCreate,
} from "#lib/validation/tenants";

// Bulk-import-specific tenant schema: builds from Zod primitives rather
// than reaching into `tenantCreateSchema.shape.*.unwrap()` so the schema
// is not coupled to the optionality of the reused schema. The import
// stepper rejects blank cells up front instead of silently inserting
// tenants with empty names. Status is `z.enum(...).default('active')`:
// mapRow sends `undefined` only when the CSV cell is BLANK (Zod's
// `.default('active')` fills it in); a non-blank cell passes through as-is
// so an unknown value FAILS the row instead of being silently coerced to a
// default.
const tenantImportSchema = z.object({
	email: z.email({ message: "Valid email is required" }),
	first_name: z
		.string()
		.min(1, "First name is required")
		.max(100, "First name cannot exceed 100 characters"),
	last_name: z
		.string()
		.min(1, "Last name is required")
		.max(100, "Last name cannot exceed 100 characters"),
	phone: phoneSchema.optional(),
	status: z.enum(TENANT_ACTIVE_STATUSES).default("active"),
}) satisfies z.ZodType<
	Pick<TenantCreate, "email" | "first_name" | "last_name" | "phone" | "status">
>;

const TEMPLATE_HEADERS = [
	"email",
	"first_name",
	"last_name",
	"phone",
	"status",
] as const;

const TEMPLATE_SAMPLE_ROWS = [
	["jane.doe@example.com", "Jane", "Doe", "415-555-0101", "active"],
	["john.smith@example.com", "John", "Smith", "415-555-0102", "pending"],
] as const;

type TenantImportInput = z.infer<typeof tenantImportSchema>;

export function tenantBulkImportConfig(): BulkImportConfig<TenantImportInput> {
	return {
		entityLabel: { singular: "Tenant", plural: "Tenants" },
		templateFilename: "tenant-import-template.csv",
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields: "email, first_name, last_name",
		optionalFields: "phone, status (defaults to active)",
		parseAndValidate: (csvText) =>
			parseCsvWithSchema(csvText, {
				schema: tenantImportSchema,
				mapRow: (raw) => {
					// Pass a non-blank status THROUGH to the schema (an unknown
					// value then fails the row); a blank cell is omitted so the
					// schema's `.default('active')` supplies the fallback.
					const rawStatus = (raw.status ?? "").trim().toLowerCase();
					return {
						email: (raw.email ?? "").trim(),
						first_name: (raw.first_name ?? "").trim(),
						last_name: (raw.last_name ?? "").trim(),
						phone: (raw.phone ?? "").trim() || undefined,
						...(rawStatus ? { status: rawStatus } : {}),
					};
				},
			}),
		insertRow: async (row) => {
			const supabase = createClient();
			const user = await getCachedUser();
			const ownerId = requireOwnerUserId(user?.id);
			const { error } = await supabase
				.from("tenants")
				.insert(omitUndefined({ ...row, owner_user_id: ownerId }));
			return { error: error ? new Error(error.message) : null };
		},
		invalidateKeys: [tenantQueries.all(), ownerDashboardKeys.all],
	};
}
