import { describe, expect, it, vi } from 'vitest'
import { buildCsvTemplate } from '#components/bulk-import/parse-csv-with-schema'

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) })
}))
vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: async () => ({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })
}))

import { tenantBulkImportConfig } from '#components/tenants/bulk-import-config'

describe('tenantBulkImportConfig', () => {
	const config = tenantBulkImportConfig()

	it('sample rows pass validation', () => {
		const csv = buildCsvTemplate(config.templateHeaders, config.templateSampleRows)
		const result = config.parseAndValidate(csv)
		for (const row of result.rows) {
			expect(row.errors).toEqual([])
		}
	})

	it('rejects blank first_name / last_name / email', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['', '', '', '', '']
		])
		const result = config.parseAndValidate(csv)
		const fields = (result.rows[0]?.errors ?? []).map(e => e.field)
		expect(fields).toContain('email')
		expect(fields).toContain('first_name')
		expect(fields).toContain('last_name')
	})

	it('defaults unknown status values to "active"', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['a@b.com', 'Alice', 'Smith', '415-555-0101', 'not-a-status']
		])
		const result = config.parseAndValidate(csv)
		const parsed = result.rows[0]?.parsed as unknown as Record<string, unknown>
		expect(parsed.status).toBe('active')
	})

	it('lowercases status values from the CSV', () => {
		const csv = buildCsvTemplate(config.templateHeaders, [
			['a@b.com', 'Alice', 'Smith', '415-555-0101', 'Active']
		])
		const result = config.parseAndValidate(csv)
		const parsed = result.rows[0]?.parsed as unknown as Record<string, unknown>
		expect(parsed.status).toBe('active')
	})

	it('sample rows must align with header length', () => {
		const headerLen = config.templateHeaders.length
		for (const row of config.templateSampleRows) {
			expect(row).toHaveLength(headerLen)
		}
	})
})
