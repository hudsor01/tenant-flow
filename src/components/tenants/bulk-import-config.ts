/**
 * Tenant bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Encapsulates everything the
 * generic stepper needs to handle tenant CSV imports:
 *   - template headers + sample rows (used by the Download Template button)
 *   - parseAndValidate factory using tenantCreateSchema
 *   - row-by-row PostgREST insert with owner_user_id attached
 *   - query keys to invalidate post-import
 */

import { createClient } from '#lib/supabase/client'
import { tenantCreateSchema } from '#lib/validation/tenants'
import type { TenantCreate } from '#lib/validation/tenants'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

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

export function tenantBulkImportConfig(): BulkImportConfig<TenantCreate> {
	return {
		entityLabel: { singular: 'Tenant', plural: 'Tenants' },
		templateFilename: 'tenant-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields: 'email, first_name, last_name',
		optionalFields: 'phone, status (defaults to active)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: tenantCreateSchema,
				mapRow: raw => {
					const rawStatus = (raw.status ?? '').trim().toLowerCase()
					const status = ALLOWED_STATUSES.has(rawStatus)
						? (rawStatus as 'active' | 'inactive' | 'pending' | 'moved_out')
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
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) return { error: new Error('Not authenticated') }
			const { error } = await supabase
				.from('tenants')
				.insert({ ...row, owner_user_id: user.id })
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [
			tenantQueries.lists(),
			tenantQueries.all(),
			ownerDashboardKeys.all
		]
	}
}
