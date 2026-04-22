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
	// Firefox + Safari require the anchor to be in the DOM for the click to
	// dispatch a download. `sr-only` hides it without an inline style (the
	// prior `link.style.visibility = 'hidden'` tripped the CLAUDE.md rule).
	link.className = 'sr-only'
	document.body.appendChild(link)
	try {
		link.click()
	} finally {
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}
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
 *
 * Row numbers are reported as CSV line numbers (header = line 1, first
 * data row = line 2) so users editing the CSV in Excel can jump to the
 * exact row on an error message.
 */
export function parseCsvWithSchema<TOutput>(
	csvText: string,
	options: ParseOptions<TOutput>
): BulkImportParseResult<TOutput> {
	// Papa handles CRLF and quoted fields, but does NOT strip a UTF-8 BOM
	// from the first header. Excel on Windows exports CSV with a BOM, which
	// would leak into the first header name and silently break the first
	// column. Strip it up front.
	const normalized = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText

	const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(
		normalized,
		{
			header: true,
			skipEmptyLines: true,
			transformHeader: (h: string) =>
				h.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, '_'),
			transform: (value: string) => value.trim()
		}
	)

	// Surface malformed-CSV errors (mismatched quotes, bad delimiters) as a
	// synthetic "row 0" entry so the validate step can render them alongside
	// per-row errors. Users see "your CSV is broken" instead of silent-junk.
	//
	// Filter out per-row field-count warnings (we already report field-level
	// schema errors) and the "UndetectableDelimiter" warning papaparse
	// emits for empty/whitespace-only input (there's nothing to delimit).
	const malformedCsvErrors = parseErrors
		.filter(
			err =>
				err.code !== 'TooFewFields' &&
				err.code !== 'TooManyFields' &&
				err.code !== 'UndetectableDelimiter'
		)
		.map(err => ({
			field: 'csv',
			message: err.message
		}))

	if (data.length === 0) {
		if (malformedCsvErrors.length > 0) {
			return {
				rows: [
					{
						row: 0,
						data: {},
						errors: malformedCsvErrors,
						parsed: null
					}
				],
				tooManyRows: false,
				totalRowCount: 0
			}
		}
		return { rows: [], tooManyRows: false, totalRowCount: 0 }
	}

	const tooManyRows = data.length > CSV_MAX_ROWS
	const totalRowCount = data.length
	const rowsToValidate = data.slice(0, CSV_MAX_ROWS)

	const rows = rowsToValidate.map((rawRow, index) => {
		// Reported row = CSV line number. Header is line 1 so the first data
		// row is line 2.
		const csvLine = index + 2
		const mapped = options.mapRow(rawRow)
		if (mapped === undefined) {
			return {
				row: csvLine,
				data: rawRow,
				errors: [{ field: 'unknown', message: 'Row is empty or invalid.' }],
				parsed: null
			}
		}

		const result = options.schema.safeParse(mapped)
		if (result.success) {
			return {
				row: csvLine,
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
			row: csvLine,
			data: rawRow,
			errors: fieldErrors,
			parsed: null
		}
	})

	return { rows, tooManyRows, totalRowCount }
}
