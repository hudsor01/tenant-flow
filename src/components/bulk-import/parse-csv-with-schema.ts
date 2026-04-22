/**
 * Generic CSV → Zod-validated rows parser used by all four entity importers.
 *
 * Shared pieces (Papa.parse config, row cap, error shape, totalRowCount
 * accounting) live here so per-entity callers only need to provide:
 *   - a Zod schema
 *   - a function that maps a raw CSV row dict to the schema's input shape
 */

import Papa from 'papaparse'
import type { z } from 'zod'
import type { BulkImportParseResult } from './types'

export const CSV_MAX_ROWS = 100
export const CSV_ACCEPTED_MIME_TYPES = ['text/csv', 'application/csv']
export const CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export function buildCsvTemplate(
	headers: readonly string[],
	rows: readonly (readonly string[])[]
): string {
	const headerRow = headers.map(h => `"${h}"`).join(',')
	const dataRows = rows.map(row => row.map(cell => `"${cell}"`).join(','))
	return [headerRow, ...dataRows].join('\n')
}

export function triggerCsvDownload(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.setAttribute('href', url)
	link.setAttribute('download', filename)
	link.style.visibility = 'hidden'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

export function getFileValidationError(file: File): string | null {
	const hasValidType =
		CSV_ACCEPTED_MIME_TYPES.includes(file.type) || file.name.endsWith('.csv')
	if (!hasValidType) return 'Please select a CSV file (.csv)'
	if (file.size > CSV_MAX_FILE_SIZE_BYTES)
		return 'File size must be less than 5MB'
	return null
}

export interface ParseOptions<TOutput> {
	/** Zod schema the mapped row is validated against. */
	schema: z.ZodType<TOutput>
	/**
	 * Maps a raw CSV row (headers normalized to lowercase_snake) to the
	 * schema's input shape. Return type is `unknown` — the schema's
	 * safeParse narrows and surfaces per-field errors for rows that don't
	 * fit, so strict typing on the map side just duplicates that check.
	 * Return `undefined` to skip the row entirely (rare; usually you want
	 * the schema to fail so the user sees a row-level error instead).
	 */
	mapRow: (raw: Record<string, string>) => unknown
}

/**
 * Parse CSV text, skip empty rows, normalize headers, validate each row
 * against the provided schema. Caps processed rows at CSV_MAX_ROWS but
 * still reports the true totalRowCount so the validate step can warn.
 */
export function parseCsvWithSchema<TOutput>(
	csvText: string,
	options: ParseOptions<TOutput>
): BulkImportParseResult<TOutput> {
	const { data } = Papa.parse<Record<string, string>>(csvText, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
		transform: (value: string) => value.trim()
	})

	if (data.length === 0) {
		return { rows: [], tooManyRows: false, totalRowCount: 0 }
	}

	const tooManyRows = data.length > CSV_MAX_ROWS
	const totalRowCount = data.length
	const rowsToValidate = data.slice(0, CSV_MAX_ROWS)

	const rows = rowsToValidate.map((rawRow, index) => {
		const mapped = options.mapRow(rawRow)
		if (mapped === undefined) {
			return {
				row: index + 1,
				data: rawRow,
				errors: [{ field: 'unknown', message: 'Row is empty or invalid.' }],
				parsed: null
			}
		}

		const result = options.schema.safeParse(mapped)
		if (result.success) {
			return {
				row: index + 1,
				data: rawRow,
				errors: [],
				parsed: result.data
			}
		}

		const fieldErrors = result.error.issues.map(issue => ({
			field: issue.path.join('.') || 'unknown',
			message: issue.message
		}))

		return {
			row: index + 1,
			data: rawRow,
			errors: fieldErrors,
			parsed: null
		}
	})

	return { rows, tooManyRows, totalRowCount }
}
