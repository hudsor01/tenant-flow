import { describe, expect, it, vi } from 'vitest'
import { buildCsvTemplate } from '#components/bulk-import/parse-csv-with-schema'

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) })
}))
vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: async () => ({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })
}))

import { unitBulkImportConfig } from '#components/units/bulk-import-config'

const PROPERTY_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('unitBulkImportConfig', () => {
	const config = unitBulkImportConfig(PROPERTY_ID)

	it('sample rows pass validation', () => {
		const csv = buildCsvTemplate(config.templateHeaders, config.templateSampleRows)
		const result = config.parseAndValidate(csv)
		for (const row of result.rows) {
			expect(row.errors).toEqual([])
		}
	})

	it('rejects blank rent_amount instead of coercing to $0', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['101', '2', '1', '850', '', 'available']
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('rent_amount')
	})

	it('flags duplicate unit_number within same CSV', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['101', '2', '1', '850', '1800', 'available'],
			['101', '3', '2', '900', '2000', 'available']
		])
		const result = config.parseAndValidate(csv)
		// First row wins; second row gets a per-row duplicate error.
		expect(result.rows[0]?.errors).toEqual([])
		expect(
			(result.rows[1]?.errors ?? []).some(e =>
				e.message.toLowerCase().includes('duplicate')
			)
		).toBe(true)
	})

	it('attaches property_id from the caller (not the CSV)', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['101', '2', '1', '850', '1800', 'available']
		])
		const result = config.parseAndValidate(csv)
		const parsed = result.rows[0]?.parsed as unknown as Record<string, unknown>
		expect(parsed.property_id).toBe(PROPERTY_ID)
	})

	it('defaults unknown status to "available"', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['101', '2', '1', '850', '1800', 'bogus']
		])
		const result = config.parseAndValidate(csv)
		const parsed = result.rows[0]?.parsed as unknown as Record<string, unknown>
		expect(parsed.status).toBe('available')
	})

	it('sample rows must align with header length', () => {
		const headerLen = config.templateHeaders.length
		for (const row of config.templateSampleRows) {
			expect(row).toHaveLength(headerLen)
		}
	})
})
