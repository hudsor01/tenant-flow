/**
 * Lease bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Encapsulates everything the
 * generic stepper needs to handle lease CSV imports. RLS on `leases`
 * already enforces that the caller owns the referenced unit and tenant
 * — any violation surfaces as a per-row error in the stepper report.
 */

import { createClient } from '#lib/supabase/client'
import { leaseInputSchema } from '#lib/validation/leases'
import type { LeaseInput } from '#lib/validation/leases'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

const TEMPLATE_HEADERS = [
	'unit_id',
	'primary_tenant_id',
	'start_date',
	'end_date',
	'rent_amount',
	'payment_day'
] as const

const TEMPLATE_SAMPLE_ROWS = [
	[
		'00000000-0000-0000-0000-000000000001',
		'00000000-0000-0000-0000-000000000002',
		'2026-05-01',
		'2027-04-30',
		'1800',
		'1'
	],
	[
		'00000000-0000-0000-0000-000000000003',
		'00000000-0000-0000-0000-000000000004',
		'2026-06-01',
		'2027-05-31',
		'2400',
		'5'
	]
] as const

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed === '') return undefined
	const parsed = Number(trimmed)
	return Number.isNaN(parsed) ? undefined : parsed
}

export function leaseBulkImportConfig(): BulkImportConfig<LeaseInput> {
	return {
		entityLabel: { singular: 'Lease', plural: 'Leases' },
		templateFilename: 'lease-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields:
			'unit_id, primary_tenant_id, start_date, end_date, rent_amount',
		optionalFields: 'payment_day (defaults to 1)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: leaseInputSchema,
				mapRow: raw => {
					const rent_amount = Number((raw.rent_amount ?? '').trim())
					const parsedPaymentDay = coerceOptionalNumber(raw.payment_day)
					const payment_day = parsedPaymentDay ?? 1
					return {
						unit_id: (raw.unit_id ?? '').trim(),
						primary_tenant_id: (raw.primary_tenant_id ?? '').trim(),
						start_date: (raw.start_date ?? '').trim(),
						end_date: (raw.end_date ?? '').trim(),
						rent_amount,
						payment_day,
						security_deposit: 0
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
				.from('leases')
				.insert({ ...row, owner_user_id: user.id })
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [
			leaseQueries.lists(),
			leaseQueries.all(),
			ownerDashboardKeys.all
		]
	}
}
