import Papa from 'papaparse'
import { propertyCreateSchema } from '#lib/validation/properties'
import type { PropertyCreate } from '#lib/validation/properties'
import type { ParsedRow } from '#types/api-contracts'

export const CSV_MAX_ROWS = 100

export const CSV_TEMPLATE_HEADERS = [
	'name',
	'address_line1',
	'address_line2',
	'city',
	'state',
	'postal_code',
	'country',
	'property_type',
] as const

export const CSV_TEMPLATE_SAMPLE_ROWS = [
	['Sunset Apartments', '123 Main St', '', 'San Francisco', 'CA', '94105', 'US', 'APARTMENT'],
	['Oak House', '456 Oak Ave', 'Unit B', 'Los Angeles', 'CA', '90001', 'US', 'SINGLE_FAMILY'],
] as const

export const CSV_ACCEPTED_MIME_TYPES = ['text/csv', 'application/csv']
export const CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const CSV_TEMPLATE_FILENAME = 'property-import-template.csv'

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

	if (!hasValidType) {
		return 'Please select a CSV file (.csv)'
	}

	if (file.size > CSV_MAX_FILE_SIZE_BYTES) {
		return 'File size must be less than 5MB'
	}

	return null
}

interface ParseResult {
	rows: ParsedRow[]
	tooManyRows: boolean
	totalRowCount: number
}

export function parseAndValidateCSV(csvText: string): ParseResult {
	const { data } = Papa.parse<Record<string, string>>(csvText, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
		transform: (value: string) => value.trim(),
	})

	if (data.length === 0) {
		return { rows: [], tooManyRows: false, totalRowCount: 0 }
	}

	const tooManyRows = data.length > CSV_MAX_ROWS
	const totalRowCount = data.length
	const rowsToValidate = data.slice(0, CSV_MAX_ROWS)

	const rows: ParsedRow[] = rowsToValidate.map((rawRow, index) => {
		const mapped = {
			name: rawRow.name ?? '',
			address_line1: rawRow.address_line1 ?? '',
			address_line2: (rawRow.address_line2 ?? '').trim() || undefined,
			city: rawRow.city ?? '',
			state: (rawRow.state ?? '').toUpperCase(),
			postal_code: rawRow.postal_code ?? '',
			country: (rawRow.country ?? '').trim() || 'US',
			property_type: (rawRow.property_type ?? '').toUpperCase(),
		}

		const result = propertyCreateSchema.safeParse(mapped)

		if (result.success) {
			return {
				row: index + 1,
				data: rawRow,
				errors: [],
				parsed: result.data as PropertyCreate,
			}
		}

		const fieldErrors = result.error.issues.map(issue => ({
			field: issue.path.join('.') || 'unknown',
			message: issue.message,
		}))

		return {
			row: index + 1,
			data: rawRow,
			errors: fieldErrors,
			parsed: null,
		}
	})

	return { rows, tooManyRows, totalRowCount }
}
