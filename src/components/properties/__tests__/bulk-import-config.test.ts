import { describe, expect, it, vi } from 'vitest'
import { buildCsvTemplate } from '#components/bulk-import/parse-csv-with-schema'

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) })
}))
vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: async () => ({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })
}))

import { propertyBulkImportConfig } from '#components/properties/bulk-import-config'

describe('propertyBulkImportConfig', () => {
	const config = propertyBulkImportConfig()

	it('sample CSV passes validation with zero errors', () => {
		const csv = buildCsvTemplate(config.templateHeaders, config.templateSampleRows)
		const result = config.parseAndValidate(csv)
		for (const row of result.rows) {
			expect(row.errors).toEqual([])
		}
	})

	it('uppercases state + property_type before validating', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'Sunset',
				'123 Main St',
				'',
				'San Francisco',
				'ca',
				'94105',
				'us',
				'apartment'
			]
		])
		const result = config.parseAndValidate(csv)
		expect(result.rows[0]?.errors).toEqual([])
		const parsed = result.rows[0]?.parsed as unknown as Record<string, string>
		expect(parsed.state).toBe('CA')
		expect(parsed.property_type).toBe('APARTMENT')
	})

	it('defaults country to US when the column is blank', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			[
				'Sunset',
				'123 Main St',
				'',
				'San Francisco',
				'CA',
				'94105',
				'',
				'APARTMENT'
			]
		])
		const result = config.parseAndValidate(csv)
		const parsed = result.rows[0]?.parsed as unknown as Record<string, string>
		expect(parsed.country).toBe('US')
	})

	it('sample rows must align with header length', () => {
		const headerLen = config.templateHeaders.length
		for (const row of config.templateSampleRows) {
			expect(row).toHaveLength(headerLen)
		}
	})
})
