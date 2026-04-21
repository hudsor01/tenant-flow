/**
 * Unit bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Takes `propertyId` from the
 * caller because unit CSVs do not include it — it's derived from the
 * route that hosts the dialog.
 */

import { createClient } from '#lib/supabase/client'
import { unitInputSchema } from '#lib/validation/units'
import type { UnitInput } from '#lib/validation/units'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

const TEMPLATE_HEADERS = [
	'unit_number',
	'bedrooms',
	'bathrooms',
	'square_feet',
	'rent_amount',
	'status'
] as const

const TEMPLATE_SAMPLE_ROWS = [
	['101', '2', '1', '850', '1800', 'available'],
	['102', '3', '2', '1100', '2400', 'available']
] as const

const ALLOWED_STATUSES = new Set([
	'available',
	'occupied',
	'maintenance',
	'reserved'
])

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed === '') return undefined
	const parsed = Number(trimmed)
	return Number.isNaN(parsed) ? undefined : parsed
}

export function unitBulkImportConfig(
	propertyId: string
): BulkImportConfig<UnitInput> {
	return {
		entityLabel: { singular: 'Unit', plural: 'Units' },
		templateFilename: 'unit-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields: 'unit_number, rent_amount',
		optionalFields:
			'bedrooms, bathrooms, square_feet, status (defaults to available)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: unitInputSchema,
				mapRow: raw => {
					const rawStatus = (raw.status ?? '').trim().toLowerCase()
					const status = ALLOWED_STATUSES.has(rawStatus)
						? rawStatus
						: 'available'
					const bedrooms = coerceOptionalNumber(raw.bedrooms)
					const bathrooms = coerceOptionalNumber(raw.bathrooms)
					const square_feet = coerceOptionalNumber(raw.square_feet)
					const rent_amount = Number((raw.rent_amount ?? '').trim())
					return {
						property_id: propertyId,
						unit_number: (raw.unit_number ?? '').trim(),
						...(bedrooms !== undefined ? { bedrooms } : {}),
						...(bathrooms !== undefined ? { bathrooms } : {}),
						...(square_feet !== undefined ? { square_feet } : {}),
						rent_amount,
						status
					}
				}
			}),
		insertRow: async row => {
			const supabase = createClient()
			const { error } = await supabase.from('units').insert(row)
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [
			unitQueries.lists(),
			unitQueries.all(),
			ownerDashboardKeys.all
		]
	}
}
