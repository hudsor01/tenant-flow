/**
 * Unit bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Takes `propertyId` from the
 * caller because unit CSVs do not include it — it's derived from the
 * route that hosts the dialog.
 *
 * Pre-flight duplicate check: two rows with the same `unit_number` in
 * the same CSV are flagged before insert rather than partially succeeding
 * on a unique-constraint error.
 */

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { unitInputSchema, unitStatusSchema } from '#lib/validation/units'
import type { UnitInput } from '#lib/validation/units'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type {
	BulkImportConfig,
	BulkImportParseResult
} from '#components/bulk-import/types'
import type { ParsedRow } from '#types/api-contracts'
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

type UnitStatus = ReturnType<typeof unitStatusSchema.parse>

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed === '') return undefined
	const parsed = Number(trimmed)
	return Number.isNaN(parsed) ? undefined : parsed
}

function normalizeStatus(raw: string | undefined): UnitStatus {
	const trimmed = (raw ?? '').trim().toLowerCase()
	const parsed = unitStatusSchema.safeParse(trimmed)
	return parsed.success ? parsed.data : 'available'
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
		parseAndValidate: csvText => {
			const result: BulkImportParseResult<UnitInput> = parseCsvWithSchema(
				csvText,
				{
					schema: unitInputSchema,
					mapRow: raw => {
						const status = normalizeStatus(raw.status)
						const bedrooms = coerceOptionalNumber(raw.bedrooms)
						const bathrooms = coerceOptionalNumber(raw.bathrooms)
						const square_feet = coerceOptionalNumber(raw.square_feet)
						// Blank rent_amount must fail validation instead of silently
						// becoming $0 (Number('') === 0 and the schema's
						// nonNegativeNumberSchema accepts 0). Pass undefined so the
						// schema's required-field check surfaces a clear row error.
						const rent_amount = coerceOptionalNumber(raw.rent_amount)
						return {
							property_id: propertyId,
							unit_number: (raw.unit_number ?? '').trim(),
							...(bedrooms !== undefined ? { bedrooms } : {}),
							...(bathrooms !== undefined ? { bathrooms } : {}),
							...(square_feet !== undefined ? { square_feet } : {}),
							...(rent_amount !== undefined ? { rent_amount } : {}),
							status
						}
					}
				}
			)

			// Pre-flight duplicate-within-CSV check. DB-level uniqueness is a
			// per-property partial index; we mirror it here so the user sees a
			// clear "rows 3 and 7 have the same unit_number" error instead of
			// a mid-batch unique-violation after row 3 already inserted.
			const seen = new Map<string, number>()
			const rowsWithDedup: ParsedRow<UnitInput>[] = result.rows.map(row => {
				if (row.parsed === null) return row
				const key = row.parsed.unit_number.toLowerCase()
				const firstSeen = seen.get(key)
				if (firstSeen !== undefined) {
					return {
						...row,
						parsed: null,
						errors: [
							...row.errors,
							{
								field: 'unit_number',
								message: `Duplicate unit_number "${row.parsed.unit_number}" (also on row ${firstSeen}).`
							}
						]
					}
				}
				seen.set(key, row.row)
				return row
			})

			return { ...result, rows: rowsWithDedup }
		},
		insertRow: async row => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)
			const { error } = await supabase
				.from('units')
				.insert({ ...row, owner_user_id: ownerId })
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [unitQueries.all(), ownerDashboardKeys.all]
	}
}
