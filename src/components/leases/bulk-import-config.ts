/**
 * Lease bulk-import configuration (v2.3 Phase 58 + audit follow-ups).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Inserts the lease AND its
 * lease_tenants junction row atomically via the `bulk_import_create_lease`
 * SECURITY DEFINER RPC. Without the junction insert the lease wouldn't
 * surface on the tenant detail view (which joins through lease_tenants).
 *
 * The RPC enforces ownership, business-rule invariants (overlap check),
 * input-range validation, and atomicity — the client is only responsible
 * for CSV parsing and per-row error surfacing.
 */

import { createClient } from '#lib/supabase/client'
import { leaseInputSchema } from '#lib/validation/leases'
import type { LeaseInput } from '#lib/validation/leases'
import { parseCsvWithSchema } from '#components/bulk-import/parse-csv-with-schema'
import type { BulkImportConfig } from '#components/bulk-import/types'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'
import { tenantQueries } from '#hooks/api/query-keys/tenant-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'

const TEMPLATE_HEADERS = [
	'unit_id',
	'primary_tenant_id',
	'start_date',
	'end_date',
	'rent_amount',
	'security_deposit',
	'payment_day',
	'rent_currency'
] as const

// Sample UUIDs are RFC 4122 v4-shaped so `zod.uuid()` accepts them during
// the template round-trip test. Replace before importing.
const TEMPLATE_SAMPLE_ROWS = [
	[
		'550e8400-e29b-41d4-a716-446655440001',
		'550e8400-e29b-41d4-a716-446655440002',
		'2026-05-01',
		'2027-04-30',
		'1800',
		'1800',
		'1',
		'USD'
	],
	[
		'550e8400-e29b-41d4-a716-446655440003',
		'550e8400-e29b-41d4-a716-446655440004',
		'2026-06-01',
		'2027-05-31',
		'2400',
		'4800',
		'5',
		'USD'
	]
] as const

// Bulk-import uses the shared `leaseInputSchema` via `.omit()` of the two
// server-defaulted fields. Do NOT `.extend()` security_deposit — that
// silently replaces the shared schema's `.max(RENT_MAXIMUM_VALUE)` guard
// with a bare `nonnegative()` check, dropping the realistic-bound ceiling.
// Blank `security_deposit` cells still surface as a row error because
// `mapRow` omits the key when coerceOptionalNumber returns undefined, and
// the leaseInputSchema defines the field as required.
const leaseImportSchema = leaseInputSchema.omit({
	lease_status: true,
	rent_currency: true
})

type LeaseImportInput = Omit<LeaseInput, 'lease_status' | 'rent_currency'> & {
	rent_currency?: string
}

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (trimmed === '') return undefined
	const parsed = Number(trimmed)
	return Number.isNaN(parsed) ? undefined : parsed
}

function coerceOptionalCurrency(value: string | undefined): string | undefined {
	if (!value) return undefined
	const trimmed = value.trim().toUpperCase()
	if (trimmed === '') return undefined
	// Shape check only — the RPC enforces 3-letter length and rejects
	// invalid codes. Anything that reaches here passes through.
	return trimmed
}

export function leaseBulkImportConfig(): BulkImportConfig<LeaseImportInput> {
	return {
		entityLabel: { singular: 'Lease', plural: 'Leases' },
		templateFilename: 'lease-import-template.csv',
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields:
			'unit_id, primary_tenant_id, start_date, end_date, rent_amount, security_deposit, payment_day',
		optionalFields: 'rent_currency (3-letter ISO code, defaults to USD)',
		parseAndValidate: csvText =>
			parseCsvWithSchema(csvText, {
				schema: leaseImportSchema,
				mapRow: raw => {
					const rent_amount = coerceOptionalNumber(raw.rent_amount)
					const payment_day = coerceOptionalNumber(raw.payment_day)
					const security_deposit = coerceOptionalNumber(raw.security_deposit)
					const rent_currency = coerceOptionalCurrency(raw.rent_currency)
					return {
						unit_id: (raw.unit_id ?? '').trim(),
						primary_tenant_id: (raw.primary_tenant_id ?? '').trim(),
						start_date: (raw.start_date ?? '').trim(),
						end_date: (raw.end_date ?? '').trim(),
						...(rent_amount !== undefined ? { rent_amount } : {}),
						...(security_deposit !== undefined ? { security_deposit } : {}),
						...(payment_day !== undefined ? { payment_day } : {}),
						...(rent_currency !== undefined ? { rent_currency } : {})
					}
				}
			}),
		insertRow: async row => {
			const supabase = createClient()
			// Atomic lease + lease_tenants insert via SECURITY DEFINER RPC.
			// RPC enforces ownership, assert_can_create_lease invariants,
			// input-range validation, and atomicity.
			const { error } = await supabase.rpc('bulk_import_create_lease', {
				p_unit_id: row.unit_id,
				p_primary_tenant_id: row.primary_tenant_id,
				p_start_date: row.start_date,
				p_end_date: row.end_date,
				p_rent_amount: row.rent_amount,
				p_security_deposit: row.security_deposit,
				p_payment_day: row.payment_day,
				...(row.rent_currency
					? { p_rent_currency: row.rent_currency }
					: {})
			})
			return { error: error ? new Error(error.message) : null }
		},
		invalidateKeys: [
			leaseQueries.all(),
			tenantQueries.all(),
			ownerDashboardKeys.all
		]
	}
}
