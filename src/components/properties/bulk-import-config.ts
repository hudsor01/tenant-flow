/**
 * Property bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Encapsulates everything the
 * generic stepper needs to handle property CSV imports:
 *   - template headers + sample rows (used by the Download Template button)
 *   - parseAndValidate factory using propertyCreateSchema
 *   - row-by-row PostgREST insert with owner_user_id attached
 *   - query keys to invalidate post-import
 */

import { createClient } from '#lib/supabase/client'
import { propertyCreateSchema } from '#lib/validation/properties'
import type { PropertyCreate } from '#lib/validation/properties'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

const TEMPLATE_HEADERS = [
	'name',
	'address_line1',
	'address_line2',
	'city',
	'state',
	'postal_code',
	'country',
	'property_type'
] as const

const TEMPLATE_SAMPLE_ROWS = [
	[
		'Sunset Apartments',
		'123 Main St',
		'',
		'San Francisco',
		'CA',
		'94105',
		'US',
		'APARTMENT'
	],
	[
		'Oak House',
		'456 Oak Ave',
		'Unit B',
		'Los Angeles',
		'CA',
		'90001',
		'US',
		'SINGLE_FAMILY'
	]
] as const

export function propertyBulkImportConfig(): BulkImportConfig<PropertyCreate> {
	return {
		entityLabel: { singular: 'Property', plural: 'Properties' },
		templateFilename: 'property-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields:
			'name, address_line1, city, state, postal_code, property_type',
		optionalFields: 'address_line2, country (defaults to US)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: propertyCreateSchema,
				mapRow: raw => ({
					name: raw.name ?? '',
					address_line1: raw.address_line1 ?? '',
					address_line2: (raw.address_line2 ?? '').trim() || undefined,
					city: raw.city ?? '',
					state: (raw.state ?? '').toUpperCase(),
					postal_code: raw.postal_code ?? '',
					country: (raw.country ?? '').trim() || 'US',
					property_type: (raw.property_type ?? '').toUpperCase()
				})
			}),
		insertRow: async row => {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) return { error: new Error('Not authenticated') }
			const { error } = await supabase
				.from('properties')
				.insert({ ...row, owner_user_id: user.id })
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [
			propertyQueries.lists(),
			propertyQueries.all(),
			ownerDashboardKeys.all
		]
	}
}
