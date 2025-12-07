import type { ParsedRow } from '@repo/shared/types/bulk-import'

export const CSV_TEMPLATE_HEADERS = [
  'name',
  'address',
  'city',
  'state',
  'postal_code',
  'property_type',
  'description'
] as const

export const CSV_TEMPLATE_SAMPLE_ROWS = [
  [
    'Sample Property 1',
    '123 Main St',
    'San Francisco',
    'CA',
    '94105',
    'APARTMENT',
    'Modern apartment building'
  ],
  [
    'Sample Property 2',
    '456 Oak Ave',
    'Los Angeles',
    'CA',
    '90001',
    'SINGLE_FAMILY',
    'Single family home'
  ]
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

export async function parseCSVFile(file: File): Promise<ParsedRow[]> {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    return []
  }

  const headerLine = lines[0]
  if (!headerLine) {
    return []
  }

  const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
  const rows: ParsedRow[] = []

  // Preview first 10 rows
  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const line = lines[i]
    if (!line) continue

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const rowData: Record<string, string> = {}
    const errors: string[] = []

    headers.forEach((header, index) => {
      rowData[header] = values[index] || ''
    })

    // Basic validation
    if (!rowData.name) errors.push('Missing name')
    if (!rowData.address) errors.push('Missing address')
    if (!rowData.city) errors.push('Missing city')
    if (!rowData.state) errors.push('Missing state')
    if (!rowData.postal_code) errors.push('Missing postal code')

    rows.push({ row: i, data: rowData, errors })
  }

  return rows
}
