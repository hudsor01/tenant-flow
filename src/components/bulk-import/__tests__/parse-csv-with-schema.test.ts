import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseCsvWithSchema, CSV_MAX_ROWS } from '../parse-csv-with-schema'

const sampleSchema = z.object({
	name: z.string().min(1),
	count: z.number().int().nonnegative()
})

function mapRow(raw: Record<string, string>) {
	return {
		name: raw.name ?? '',
		count: Number(raw.count ?? 0)
	}
}

describe('parseCsvWithSchema', () => {
	it('returns empty result for empty CSV', () => {
		const result = parseCsvWithSchema('', { schema: sampleSchema, mapRow })
		expect(result.rows).toEqual([])
		expect(result.tooManyRows).toBe(false)
		expect(result.totalRowCount).toBe(0)
	})

	it('parses a valid CSV and returns typed rows', () => {
		const csv = 'name,count\nalpha,1\nbeta,2\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows).toHaveLength(2)
		expect(result.rows[0]?.errors).toEqual([])
		expect(result.rows[0]?.parsed).toEqual({ name: 'alpha', count: 1 })
		expect(result.rows[1]?.parsed).toEqual({ name: 'beta', count: 2 })
		expect(result.tooManyRows).toBe(false)
	})

	it('surfaces per-row errors without aborting the batch', () => {
		// Row 2 fails validation (name empty), row 1 and 3 are fine.
		const csv = 'name,count\nalpha,1\n,5\ngamma,3\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows).toHaveLength(3)
		expect(result.rows[0]?.errors).toEqual([])
		expect(result.rows[1]?.errors.length).toBeGreaterThan(0)
		// Assert the specific offending field — catches regressions that
		// silently change which Zod path is reported.
		expect(result.rows[1]?.errors[0]?.field).toBe('name')
		expect(result.rows[1]?.parsed).toBeNull()
		expect(result.rows[2]?.errors).toEqual([])
	})

	it('escapes embedded quotes when building a CSV template', async () => {
		const { buildCsvTemplate } = await import('../parse-csv-with-schema')
		// Round-trip: a sample row with embedded quotes must be parseable
		// when re-read through `parseCsvWithSchema`. Regression guard for
		// the H1 finding that `buildCsvTemplate` didn't double quotes.
		const csv = buildCsvTemplate(
			['name', 'count'],
			[[`She said "hi"`, '5']]
		)
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows[0]?.parsed).toEqual({
			name: 'She said "hi"',
			count: 5
		})
	})

	it('normalizes header whitespace + casing', () => {
		const csv = ' Name , Count \nalpha,1\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		// Headers get transformed to lowercase_snake before mapRow sees them.
		expect(result.rows[0]?.parsed).toEqual({ name: 'alpha', count: 1 })
	})

	it('caps processed rows at CSV_MAX_ROWS but reports true totalRowCount', () => {
		const extraRows = Array.from(
			{ length: CSV_MAX_ROWS + 5 },
			(_, i) => `row${i},${i}`
		).join('\n')
		const csv = `name,count\n${extraRows}\n`
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows).toHaveLength(CSV_MAX_ROWS)
		expect(result.totalRowCount).toBe(CSV_MAX_ROWS + 5)
		expect(result.tooManyRows).toBe(true)
	})

	it('respects mapRow returning undefined to skip a row entirely', () => {
		const csv = 'name,count\nalpha,1\nSKIP,2\ngamma,3\n'
		const skipMap = (raw: Record<string, string>) => {
			if (raw.name === 'SKIP') return undefined
			return { name: raw.name ?? '', count: Number(raw.count ?? 0) }
		}
		const result = parseCsvWithSchema(csv, {
			schema: sampleSchema,
			mapRow: skipMap
		})
		expect(result.rows).toHaveLength(3)
		// Middle row yields an error because mapRow returned undefined.
		expect(result.rows[1]?.parsed).toBeNull()
		expect(result.rows[1]?.errors[0]?.message).toMatch(/empty or invalid/i)
	})

	it('reports row numbers as CSV line numbers (header = line 1)', () => {
		const csv = 'name,count\nalpha,1\n,5\ngamma,3\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		// First data row = CSV line 2, second = line 3, third = line 4.
		expect(result.rows.map(r => r.row)).toEqual([2, 3, 4])
	})

	it('strips UTF-8 BOM from the first header (Excel-on-Windows export)', () => {
		const csv = '\uFEFFname,count\nalpha,1\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows).toHaveLength(1)
		expect(result.rows[0]?.parsed).toEqual({ name: 'alpha', count: 1 })
	})

	it('handles quoted fields with embedded commas and quotes', () => {
		const csv = 'name,count\n"Smith, John",5\n"She said ""hi""",7\n'
		const result = parseCsvWithSchema(csv, { schema: sampleSchema, mapRow })
		expect(result.rows).toHaveLength(2)
		expect(result.rows[0]?.parsed).toEqual({ name: 'Smith, John', count: 5 })
		expect(result.rows[1]?.parsed).toEqual({
			name: 'She said "hi"',
			count: 7
		})
	})
})
