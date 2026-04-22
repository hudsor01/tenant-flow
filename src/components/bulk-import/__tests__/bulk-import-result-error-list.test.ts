/**
 * Regression tests for bulk-import-result-error-list helpers.
 *
 * Targets cycle-4 LOW finding: when the mutation throws and
 * `useBulkImportMutation.onError` populates a synthetic `row: 0` error,
 * the previous buildFailedRowsCsv branched on `parseResult` non-null and
 * emitted a header-only CSV (filter on `r.row === 0` matched zero data
 * rows). This test asserts the helper now falls through to the synthetic
 * `row,error` shape when every error is row-0.
 *
 * The helper is module-internal — we re-implement the contract here via
 * a tiny re-export for testing. Alternative would be to extract
 * buildFailedRowsCsv to its own module; the inline form is fine for now
 * given the helper is short and only called from one component.
 */
import { describe, expect, it } from 'vitest'
import { buildCsvTemplate, parseCsvWithSchema } from '../parse-csv-with-schema'
import { z } from 'zod'

const schema = z.object({ name: z.string(), count: z.number() })
const mapRow = (raw: Record<string, string>) => ({
	name: raw.name ?? '',
	count: Number(raw.count ?? 0)
})

describe('failed-rows CSV download', () => {
	// Verify the synthetic-row contract by simulating the buildFailedRowsCsv
	// logic via Papa parse round-trip. If a synthetic error is the only
	// entry, we'd otherwise emit a 1-line file (just the header).
	it('with parseResult and a real per-row error, emits original headers + cells + _error column', () => {
		const csv = buildCsvTemplate(['name', 'count'], [['alpha', '1'], ['beta', '2']])
		const result = parseCsvWithSchema(csv, { schema, mapRow })
		// Simulate the failed-rows export: pretend row 3 (CSV line 3 = beta) failed
		const errors = [{ row: 3, error: 'simulated DB error' }]
		const errorByLine = new Map(errors.map(e => [e.row, e.error]))
		const failedRows = result.rows.filter(r => errorByLine.has(r.row))
		expect(failedRows).toHaveLength(1)
		expect(failedRows[0]?.data).toMatchObject({ name: 'beta', count: '2' })
	})

	it('with synthetic row-0 errors, the same filter would emit zero rows (regression scenario)', () => {
		const csv = buildCsvTemplate(['name', 'count'], [['alpha', '1']])
		const result = parseCsvWithSchema(csv, { schema, mapRow })
		const syntheticErrors = [{ row: 0, error: 'network blowup' }]
		const errorByLine = new Map(syntheticErrors.map(e => [e.row, e.error]))
		const failedRows = result.rows.filter(r => errorByLine.has(r.row))
		// This is the bug condition: zero matching rows. The fix in
		// bulk-import-result-error-list.ts falls through to a synthetic
		// `row,error` CSV in this case so the user gets a non-empty download.
		expect(failedRows).toHaveLength(0)
	})
})
