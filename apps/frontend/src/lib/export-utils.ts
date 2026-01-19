/**
 * CSV Export Utilities
 *
 * Generic utilities for exporting data to CSV format with proper escaping
 * and browser download triggering.
 */

export interface CsvColumnMapping<T> {
	header: string
	accessor: (row: T) => string | number | null | undefined
}

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any existing quotes
 */
function escapeCsvValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return ''
	}

	const stringValue = String(value)

	// Check if escaping is needed
	if (
		stringValue.includes(',') ||
		stringValue.includes('"') ||
		stringValue.includes('\n') ||
		stringValue.includes('\r')
	) {
		// Escape quotes by doubling them
		const escaped = stringValue.replace(/"/g, '""')
		return `"${escaped}"`
	}

	return stringValue
}

/**
 * Convert an array of objects to CSV string
 */
export function convertToCsv<T>(
	data: T[],
	columns: CsvColumnMapping<T>[]
): string {
	// Header row
	const headers = columns.map(col => escapeCsvValue(col.header)).join(',')

	// Data rows
	const rows = data.map(row =>
		columns.map(col => escapeCsvValue(col.accessor(row))).join(',')
	)

	return [headers, ...rows].join('\n')
}

/**
 * Trigger a browser download of a CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
	// Create blob with UTF-8 BOM for Excel compatibility
	const bom = '\uFEFF'
	const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

	// Create download link
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.setAttribute('href', url)
	link.setAttribute('download', filename)

	// Trigger download
	document.body.appendChild(link)
	link.click()

	// Cleanup
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

/**
 * Generate a filename with current date
 */
export function generateExportFilename(prefix: string): string {
	const date = new Date().toISOString().split('T')[0]
	return `${prefix}-${date}.csv`
}

/**
 * Convenience function to export data to CSV and trigger download
 */
export function exportToCsv<T>(
	data: T[],
	columns: CsvColumnMapping<T>[],
	filenamePrefix: string
): void {
	const csvContent = convertToCsv(data, columns)
	const filename = generateExportFilename(filenamePrefix)
	downloadCsv(csvContent, filename)
}
