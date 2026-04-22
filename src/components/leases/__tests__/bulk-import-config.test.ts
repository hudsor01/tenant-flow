import { describe, expect, it, vi } from 'vitest'
import { buildCsvTemplate } from '#components/bulk-import/parse-csv-with-schema'

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({ rpc: async () => ({ error: null }) })
}))

import { leaseBulkImportConfig } from '#components/leases/bulk-import-config'

describe('leaseBulkImportConfig', () => {
	const config = leaseBulkImportConfig()

	it('sample rows pass validation', () => {
		const csv = buildCsvTemplate(config.templateHeaders, config.templateSampleRows)
		const result = config.parseAndValidate(csv)
		for (const row of result.rows) {
			expect(row.errors).toEqual([])
		}
	})

	it('rejects blank rent_amount', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'550e8400-e29b-41d4-a716-446655440001',
				'550e8400-e29b-41d4-a716-446655440002',
				'2026-05-01',
				'2027-04-30',
				'',
				'1800',
				'1'
			]
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('rent_amount')
	})

	it('rejects blank security_deposit (no silent $0 coercion)', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'550e8400-e29b-41d4-a716-446655440001',
				'550e8400-e29b-41d4-a716-446655440002',
				'2026-05-01',
				'2027-04-30',
				'1800',
				'',
				'1'
			]
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('security_deposit')
	})

	it('rejects explicit payment_day=0 with a schema error', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'550e8400-e29b-41d4-a716-446655440001',
				'550e8400-e29b-41d4-a716-446655440002',
				'2026-05-01',
				'2027-04-30',
				'1800',
				'1800',
				'0'
			]
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('payment_day')
	})

	it('rejects invalid UUID shapes for unit_id / primary_tenant_id', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'not-a-uuid',
				'also-not-a-uuid',
				'2026-05-01',
				'2027-04-30',
				'1800',
				'1800',
				'1'
			]
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('unit_id')
		expect(fields).toContain('primary_tenant_id')
	})

	it('sample rows must align with header length', () => {
		const headerLen = config.templateHeaders.length
		for (const row of config.templateSampleRows) {
			expect(row).toHaveLength(headerLen)
		}
	})
})
