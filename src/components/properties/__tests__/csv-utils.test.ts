/**
 * Unit Tests: CSV Utilities for Bulk Import
 *
 * Tests the CSV utility functions:
 * - buildCsvTemplate: Generates CSV content from headers and rows
 * - getFileValidationError: Validates file type and size
 * - parseAndValidateCSV: Parses CSV content with Papa Parse + Zod validation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
	buildCsvTemplate,
	getFileValidationError,
	parseAndValidateCSV,
	CSV_TEMPLATE_HEADERS,
	CSV_TEMPLATE_SAMPLE_ROWS,
	CSV_ACCEPTED_MIME_TYPES,
	CSV_MAX_FILE_SIZE_BYTES,
	CSV_MAX_ROWS
} from '../csv-utils'

describe('CSV Utilities', () => {
	describe('buildCsvTemplate', () => {
		it('generates CSV with headers and rows', () => {
			const headers = ['name', 'address_line1', 'city']
			const rows = [['Property 1', '123 Main St', 'NYC']]

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe(
				'"name","address_line1","city"\n"Property 1","123 Main St","NYC"'
			)
		})

		it('handles multiple rows', () => {
			const headers = ['name', 'city']
			const rows = [
				['Property 1', 'NYC'],
				['Property 2', 'LA']
			]

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe(
				'"name","city"\n"Property 1","NYC"\n"Property 2","LA"'
			)
		})

		it('handles empty rows array', () => {
			const headers = ['name', 'address_line1']
			const rows: string[][] = []

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe('"name","address_line1"')
		})

		it('properly quotes all values', () => {
			const headers = ['name']
			const rows = [['Value with, comma']]

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe('"name"\n"Value with, comma"')
		})

		it('generates valid template with default headers and sample rows', () => {
			const result = buildCsvTemplate(
				CSV_TEMPLATE_HEADERS,
				CSV_TEMPLATE_SAMPLE_ROWS
			)

			expect(result).toContain('"name"')
			expect(result).toContain('"address_line1"')
			expect(result).toContain('"Sunset Apartments"')
			expect(result).toContain('"Oak House"')
		})
	})

	describe('getFileValidationError', () => {
		it('returns null for valid CSV file with text/csv type', () => {
			const file = new File(['content'], 'test.csv', { type: 'text/csv' })

			const result = getFileValidationError(file)

			expect(result).toBeNull()
		})

		it('returns null for valid CSV file with application/csv type', () => {
			const file = new File(['content'], 'test.csv', {
				type: 'application/csv'
			})

			const result = getFileValidationError(file)

			expect(result).toBeNull()
		})

		it('returns null for file with .csv extension regardless of mime type', () => {
			const file = new File(['content'], 'test.csv', { type: '' })

			const result = getFileValidationError(file)

			expect(result).toBeNull()
		})

		it('returns error for non-CSV file type', () => {
			const file = new File(['content'], 'test.txt', { type: 'text/plain' })

			const result = getFileValidationError(file)

			expect(result).toBe('Please select a CSV file (.csv)')
		})

		it('returns error for file exceeding size limit', () => {
			const file = new File(['x'], 'large.csv', { type: 'text/csv' })
			Object.defineProperty(file, 'size', {
				value: CSV_MAX_FILE_SIZE_BYTES + 1
			})

			const result = getFileValidationError(file)

			expect(result).toBe('File size must be less than 5MB')
		})

		it('returns null for file at exactly the size limit', () => {
			const file = new File(['x'], 'exact.csv', { type: 'text/csv' })
			Object.defineProperty(file, 'size', { value: CSV_MAX_FILE_SIZE_BYTES })

			const result = getFileValidationError(file)

			expect(result).toBeNull()
		})

		it('validates type before size', () => {
			const file = new File(['x'], 'large.txt', { type: 'text/plain' })
			Object.defineProperty(file, 'size', {
				value: CSV_MAX_FILE_SIZE_BYTES + 1
			})

			const result = getFileValidationError(file)

			expect(result).toBe('Please select a CSV file (.csv)')
		})
	})

	describe('parseAndValidateCSV', () => {
		it('parses valid CSV with all required fields', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
Sunset Apartments,123 Main St,San Francisco,CA,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]?.errors).toHaveLength(0)
			expect(result.rows[0]?.parsed).not.toBeNull()
			expect(result.rows[0]?.parsed?.name).toBe('Sunset Apartments')
			expect(result.rows[0]?.parsed?.address_line1).toBe('123 Main St')
			expect(result.rows[0]?.parsed?.city).toBe('San Francisco')
			expect(result.rows[0]?.parsed?.state).toBe('CA')
			expect(result.rows[0]?.parsed?.postal_code).toBe('94105')
			expect(result.rows[0]?.parsed?.property_type).toBe('APARTMENT')
		})

		it('returns structured errors for missing required field (name)', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
,123 Main St,San Francisco,CA,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]?.parsed).toBeNull()
			expect(result.rows[0]?.errors.length).toBeGreaterThan(0)
			const nameError = result.rows[0]?.errors.find(e => e.field === 'name')
			expect(nameError).toBeDefined()
			expect(nameError?.message).toBeTruthy()
		})

		it('returns multiple errors for multiple missing fields', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
,,,,, `

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]?.parsed).toBeNull()
			expect(result.rows[0]?.errors.length).toBeGreaterThanOrEqual(3)
			// Each error has field and message
			for (const error of result.rows[0]?.errors ?? []) {
				expect(error.field).toBeTruthy()
				expect(error.message).toBeTruthy()
			}
		})

		it('validates each row independently', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
Sunset Apartments,123 Main St,San Francisco,CA,94105,APARTMENT
,456 Oak Ave,Los Angeles,CA,90001,SINGLE_FAMILY`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(2)
			expect(result.rows[0]?.errors).toHaveLength(0)
			expect(result.rows[0]?.parsed).not.toBeNull()
			expect(result.rows[1]?.errors.length).toBeGreaterThan(0)
			expect(result.rows[1]?.parsed).toBeNull()
		})

		it('flags tooManyRows for 101+ rows and validates first 100', () => {
			const dataRows = Array.from(
				{ length: 150 },
				(_, i) => `Property ${i + 1},${100 + i} Main St,City,CA,${90000 + i},APARTMENT`
			).join('\n')
			const csvText = `name,address_line1,city,state,postal_code,property_type\n${dataRows}`

			const result = parseAndValidateCSV(csvText)

			expect(result.tooManyRows).toBe(true)
			expect(result.totalRowCount).toBe(150)
			expect(result.rows).toHaveLength(100)
		})

		it('returns empty result for empty CSV', () => {
			const result = parseAndValidateCSV('')

			expect(result.rows).toHaveLength(0)
			expect(result.tooManyRows).toBe(false)
			expect(result.totalRowCount).toBe(0)
		})

		it('returns empty result for headers-only CSV', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(0)
			expect(result.tooManyRows).toBe(false)
			expect(result.totalRowCount).toBe(0)
		})

		it('handles quoted values with commas correctly', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
"Sunset Apartments","123 Main St, Suite 100",San Francisco,CA,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]?.data.address_line1).toBe('123 Main St, Suite 100')
			expect(result.rows[0]?.errors).toHaveLength(0)
		})

		it('trims whitespace from values', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
  Sunset Apartments  ,  123 Main St  ,  San Francisco  ,  CA  ,  94105  ,  APARTMENT  `

			const result = parseAndValidateCSV(csvText)

			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]?.parsed?.name).toBe('Sunset Apartments')
			expect(result.rows[0]?.parsed?.address_line1).toBe('123 Main St')
			expect(result.rows[0]?.parsed?.city).toBe('San Francisco')
		})

		it('normalizes state to uppercase', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
Sunset Apartments,123 Main St,San Francisco,ca,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.parsed?.state).toBe('CA')
		})

		it('normalizes property_type to uppercase', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
Sunset Apartments,123 Main St,San Francisco,CA,94105,apartment`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.parsed?.property_type).toBe('APARTMENT')
		})

		it('defaults country to US when empty', () => {
			const csvText = `name,address_line1,city,state,postal_code,country,property_type
Sunset Apartments,123 Main St,San Francisco,CA,94105,,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.parsed?.country).toBe('US')
		})

		it('sets empty address_line2 to undefined', () => {
			const csvText = `name,address_line1,address_line2,city,state,postal_code,property_type
Sunset Apartments,123 Main St,,San Francisco,CA,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.parsed?.address_line2).toBeUndefined()
		})

		it('preserves non-empty address_line2', () => {
			const csvText = `name,address_line1,address_line2,city,state,postal_code,property_type
Oak House,456 Oak Ave,Unit B,Los Angeles,CA,90001,SINGLE_FAMILY`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.parsed?.address_line2).toBe('Unit B')
		})

		it('uses 1-based row numbers', () => {
			const csvText = `name,address_line1,city,state,postal_code,property_type
Property A,123 Main St,NYC,NY,10001,APARTMENT
Property B,456 Oak Ave,LA,CA,90001,SINGLE_FAMILY
Property C,789 Pine Rd,Chicago,IL,60601,CONDO`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.row).toBe(1)
			expect(result.rows[1]?.row).toBe(2)
			expect(result.rows[2]?.row).toBe(3)
		})

		it('normalizes header casing', () => {
			const csvText = `Name,ADDRESS_LINE1,City,STATE,Postal_Code,Property_Type
Sunset Apartments,123 Main St,San Francisco,CA,94105,APARTMENT`

			const result = parseAndValidateCSV(csvText)

			expect(result.rows[0]?.errors).toHaveLength(0)
			expect(result.rows[0]?.parsed).not.toBeNull()
		})

		it('does not flag tooManyRows for exactly 100 rows', () => {
			const dataRows = Array.from(
				{ length: 100 },
				(_, i) => `Property ${i + 1},${100 + i} Main St,City,CA,${90000 + i},APARTMENT`
			).join('\n')
			const csvText = `name,address_line1,city,state,postal_code,property_type\n${dataRows}`

			const result = parseAndValidateCSV(csvText)

			expect(result.tooManyRows).toBe(false)
			expect(result.totalRowCount).toBe(100)
			expect(result.rows).toHaveLength(100)
		})
	})

	describe('Constants', () => {
		it('has correct template headers', () => {
			expect(CSV_TEMPLATE_HEADERS).toContain('name')
			expect(CSV_TEMPLATE_HEADERS).toContain('address_line1')
			expect(CSV_TEMPLATE_HEADERS).toContain('address_line2')
			expect(CSV_TEMPLATE_HEADERS).toContain('city')
			expect(CSV_TEMPLATE_HEADERS).toContain('state')
			expect(CSV_TEMPLATE_HEADERS).toContain('postal_code')
			expect(CSV_TEMPLATE_HEADERS).toContain('country')
			expect(CSV_TEMPLATE_HEADERS).toContain('property_type')
			// Old headers should NOT be present
			expect(CSV_TEMPLATE_HEADERS).not.toContain('address')
			expect(CSV_TEMPLATE_HEADERS).not.toContain('description')
		})

		it('has CSV_MAX_ROWS set to 100', () => {
			expect(CSV_MAX_ROWS).toBe(100)
		})

		it('has correct accepted mime types', () => {
			expect(CSV_ACCEPTED_MIME_TYPES).toContain('text/csv')
			expect(CSV_ACCEPTED_MIME_TYPES).toContain('application/csv')
		})

		it('has correct max file size (5MB)', () => {
			expect(CSV_MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024)
		})
	})
})
