/**
 * Unit Tests: CSV Utilities for Bulk Import
 *
 * Tests the CSV utility functions:
 * - buildCsvTemplate: Generates CSV content from headers and rows
 * - getFileValidationError: Validates file type and size
 * - parseCSVFile: Parses CSV content and validates rows
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
	buildCsvTemplate,
	getFileValidationError,
	parseCSVFile,
	CSV_TEMPLATE_HEADERS,
	CSV_TEMPLATE_SAMPLE_ROWS,
	CSV_ACCEPTED_MIME_TYPES,
	CSV_MAX_FILE_SIZE_BYTES
} from '../csv-utils'

// Helper to create a File with working text() method
function createMockFile(content: string, name: string, type: string): File {
	const blob = new Blob([content], { type })
	const file = new File([blob], name, { type })
	// Mock the text() method since jsdom doesn't fully support it
	file.text = () => Promise.resolve(content)
	return file
}

describe('CSV Utilities', () => {
	describe('buildCsvTemplate', () => {
		it('generates CSV with headers and rows', () => {
			const headers = ['name', 'address', 'city']
			const rows = [['Property 1', '123 Main St', 'NYC']]

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe(
				'"name","address","city"\n"Property 1","123 Main St","NYC"'
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
			const headers = ['name', 'address']
			const rows: string[][] = []

			const result = buildCsvTemplate(headers, rows)

			expect(result).toBe('"name","address"')
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
			expect(result).toContain('"address"')
			expect(result).toContain('"Sample Property 1"')
			expect(result).toContain('"Sample Property 2"')
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
			// Create a small file but mock its size to exceed 5MB
			const file = new File(['x'], 'large.csv', { type: 'text/csv' })
			Object.defineProperty(file, 'size', {
				value: CSV_MAX_FILE_SIZE_BYTES + 1
			})

			const result = getFileValidationError(file)

			expect(result).toBe('File size must be less than 5MB')
		})

		it('returns null for file at exactly the size limit', () => {
			// Create a small file but mock its size to be exactly at the limit
			const file = new File(['x'], 'exact.csv', { type: 'text/csv' })
			Object.defineProperty(file, 'size', { value: CSV_MAX_FILE_SIZE_BYTES })

			const result = getFileValidationError(file)

			expect(result).toBeNull()
		})

		it('validates type before size', () => {
			// Invalid type AND too large - should return type error first
			// Use a small file but mock its size to exceed 5MB
			const file = new File(['x'], 'large.txt', { type: 'text/plain' })
			Object.defineProperty(file, 'size', {
				value: CSV_MAX_FILE_SIZE_BYTES + 1
			})

			const result = getFileValidationError(file)

			expect(result).toBe('Please select a CSV file (.csv)')
		})
	})

	describe('parseCSVFile', () => {
		it('parses valid CSV with all required fields', async () => {
			const csvContent = `name,address,city,state,postal_code
Property 1,123 Main St,NYC,NY,10001`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				row: 1,
				data: {
					name: 'Property 1',
					address: '123 Main St',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				},
				errors: []
			})
		})

		it('returns errors for missing required fields', async () => {
			const csvContent = `name,address,city,state,postal_code
,123 Main St,NYC,NY,10001`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(1)
			expect(result[0]?.errors).toContain('Missing name')
		})

		it('returns multiple errors for multiple missing fields', async () => {
			const csvContent = `name,address,city,state,postal_code
,,,,`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(1)
			expect(result[0]?.errors).toContain('Missing name')
			expect(result[0]?.errors).toContain('Missing address')
			expect(result[0]?.errors).toContain('Missing city')
			expect(result[0]?.errors).toContain('Missing state')
			expect(result[0]?.errors).toContain('Missing postal code')
		})

		it('parses multiple rows', async () => {
			const csvContent = `name,address,city,state,postal_code
Property 1,123 Main St,NYC,NY,10001
Property 2,456 Oak Ave,LA,CA,90001`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(2)
			expect(result[0]?.data.name).toBe('Property 1')
			expect(result[1]?.data.name).toBe('Property 2')
		})

		it('limits preview to first 10 rows', async () => {
			const rows = Array.from(
				{ length: 15 },
				(_, i) => `Property ${i + 1},Address ${i + 1},City,ST,${10000 + i}`
			).join('\n')
			const csvContent = `name,address,city,state,postal_code\n${rows}`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(10)
		})

		it('returns empty array for file with only headers', async () => {
			const csvContent = `name,address,city,state,postal_code`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(0)
		})

		it('returns empty array for empty file', async () => {
			const file = createMockFile('', 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result).toHaveLength(0)
		})

		it('handles quoted values correctly', async () => {
			const csvContent = `name,address,city,state,postal_code
"Property 1","123 Main St","NYC","NY","10001"`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result[0]?.data.name).toBe('Property 1')
			expect(result[0]?.data.address).toBe('123 Main St')
		})

		it('handles extra whitespace in values', async () => {
			const csvContent = `name,address,city,state,postal_code
  Property 1  ,  123 Main St  ,  NYC  ,  NY  ,  10001  `
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result[0]?.data.name).toBe('Property 1')
			expect(result[0]?.data.address).toBe('123 Main St')
		})

		it('handles optional fields', async () => {
			const csvContent = `name,address,city,state,postal_code,property_type,description
Property 1,123 Main St,NYC,NY,10001,APARTMENT,Nice place`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result[0]?.data.property_type).toBe('APARTMENT')
			expect(result[0]?.data.description).toBe('Nice place')
			expect(result[0]?.errors).toHaveLength(0)
		})

		it('assigns correct row numbers', async () => {
			const csvContent = `name,address,city,state,postal_code
Property 1,123 Main St,NYC,NY,10001
Property 2,456 Oak Ave,LA,CA,90001
Property 3,789 Pine Rd,CHI,IL,60601`
			const file = createMockFile(csvContent, 'test.csv', 'text/csv')

			const result = await parseCSVFile(file)

			expect(result[0]?.row).toBe(1)
			expect(result[1]?.row).toBe(2)
			expect(result[2]?.row).toBe(3)
		})
	})

	describe('Constants', () => {
		it('has correct template headers', () => {
			expect(CSV_TEMPLATE_HEADERS).toContain('name')
			expect(CSV_TEMPLATE_HEADERS).toContain('address')
			expect(CSV_TEMPLATE_HEADERS).toContain('city')
			expect(CSV_TEMPLATE_HEADERS).toContain('state')
			expect(CSV_TEMPLATE_HEADERS).toContain('postal_code')
			expect(CSV_TEMPLATE_HEADERS).toContain('property_type')
			expect(CSV_TEMPLATE_HEADERS).toContain('description')
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
