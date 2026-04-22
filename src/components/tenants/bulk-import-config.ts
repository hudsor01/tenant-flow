/**
 * Tenant bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Encapsulates everything the
 * generic stepper needs to handle tenant CSV imports:
 *   - template headers + sample rows (used by the Download Template button)
 *   - parseAndValidate factory using a bulk-import-specific required schema
 *   - row-by-row PostgREST insert with owner_user_id attached
 *   - query keys to invalidate post-import
 */

import { z } from 'zod'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { phoneSchema } from '#lib/validation/common'
import type { TenantCreate } from '#lib/validation/tenants'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

// Bulk-import-specific tenant schema: builds from Zod primitives rather
// than reaching into `tenantCreateSchema.shape.*.unwrap()` so the schema
// is not coupled to the optionality of the reused schema. The import
// stepper rejects blank cells up front instead of silently inserting
// tenants with empty names.
const tenantImportSchema = z.object({
	email: z.email({ message: 'Valid email is required' }),
	first_name: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name cannot exceed 100 characters'),
	last_name: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name cannot exceed 100 characters'),
	phone: phoneSchema.optional(),
	status: z.enum(['active', 'inactive', 'pending', 'moved_out']).optional()
}) satisfies z.ZodType<
	Pick<TenantCreate, 'email' | 'first_name' | 'last_name' | 'phone' | 'status'>
>

const TEMPLATE_HEADERS = [
	'email',
	'first_name',
	'last_name',
	'phone',
	'status'
] as const

const TEMPLATE_SAMPLE_ROWS = [
	['jane.doe@example.com', 'Jane', 'Doe', '415-555-0101', 'active'],
	['john.smith@example.com', 'John', 'Smith', '415-555-0102', 'pending']
] as const

const ALLOWED_STATUSES = new Set([
	'active',
	'inactive',
	'pending',
	'moved_out'
])

type TenantImportInput = z.infer<typeof tenantImportSchema>

export function tenantBulkImportConfig(): BulkImportConfig<TenantImportInput> {
	return {
		entityLabel: { singular: 'Tenant', plural: 'Tenants' },
		templateFilename: 'tenant-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields: 'email, first_name, last_name',
		optionalFields: 'phone, status (defaults to active)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: tenantImportSchema,
				mapRow: raw => {
					const rawStatus = (raw.status ?? '').trim().toLowerCase()
					const status = ALLOWED_STATUSES.has(rawStatus)
						? (rawStatus as TenantImportInput['status'])
						: 'active'
					return {
						email: (raw.email ?? '').trim(),
						first_name: (raw.first_name ?? '').trim(),
						last_name: (raw.last_name ?? '').trim(),
						phone: (raw.phone ?? '').trim() || undefined,
						status
					}
				}
			}),
		insertRow: async row => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)
			const { error } = await supabase
				.from('tenants')
				.insert({ ...row, owner_user_id: ownerId })
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [tenantQueries.all(), ownerDashboardKeys.all]
	}
}
