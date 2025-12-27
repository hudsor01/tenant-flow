/**
 * Unit Tests: BulkImportValidateStep Component
 *
 * Tests the validation step of the bulk import dialog:
 * - Displays file information
 * - Shows preview table with parsed data
 * - Highlights rows with validation errors
 * - Shows appropriate status indicators
 *
 * @vitest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { BulkImportValidateStep } from '../bulk-import-validate-step'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { ParsedRow } from '@repo/shared/types/api-contracts'

describe('BulkImportValidateStep Component', () => {
	const createMockFile = (name: string, _size: number) => {
		return new File(['content'], name, { type: 'text/csv' })
	}

	const createParsedRow = (
		row: number,
		data: Partial<Record<string, string>>,
		errors: string[] = []
	): ParsedRow => ({
		row,
		data: {
			name: data.name || '',
			address: data.address || '',
			city: data.city || '',
			state: data.state || '',
			postal_code: data.postal_code || '',
			...data
		},
		errors
	})

	describe('File Information', () => {
		it('displays file name', () => {
			const file = createMockFile('properties.csv', 1024)
			const parsedData: ParsedRow[] = []

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('properties.csv')).toBeInTheDocument()
		})

		it('displays file size in KB', () => {
			const file = new File(['x'.repeat(2048)], 'test.csv', {
				type: 'text/csv'
			})
			const parsedData: ParsedRow[] = []

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText(/kb/i)).toBeInTheDocument()
		})

		it('shows file check icon', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = []

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// FileCheck icon should be present (via lucide-react)
			const iconContainer = document.querySelector('.icon-container-md')
			expect(iconContainer).toBeInTheDocument()
		})
	})

	describe('Preview Table', () => {
		it('shows preview row count', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// New UI shows "Data Preview" header with row count in a badge
			expect(screen.getByText('Data Preview')).toBeInTheDocument()
			expect(screen.getByText('2 rows')).toBeInTheDocument()
		})

		it('renders table headers', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Row')).toBeInTheDocument()
			expect(screen.getByText('Name')).toBeInTheDocument()
			expect(screen.getByText('Address')).toBeInTheDocument()
			expect(screen.getByText('City')).toBeInTheDocument()
			expect(screen.getByText('State')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
		})

		it('displays row data correctly', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Test Property',
					address: '123 Main St',
					city: 'New York',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Test Property')).toBeInTheDocument()
			expect(screen.getByText('123 Main St')).toBeInTheDocument()
			expect(screen.getByText('New York')).toBeInTheDocument()
			expect(screen.getByText('NY')).toBeInTheDocument()
		})

		it('shows em dash for missing optional data', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: 'Property',
						address: '',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					['Missing address']
				)
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// New UI uses em dash (—) instead of hyphen (-)
			expect(screen.getByText('—')).toBeInTheDocument()
		})

		it('shows "No data to preview" when parsedData is empty', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = []

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText(/no data to preview/i)).toBeInTheDocument()
		})
	})

	describe('Validation Status', () => {
		it('shows "Valid" status for rows without errors', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Valid')).toBeInTheDocument()
		})

		it('shows error message for rows with errors', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: '',
						address: '123 Main',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					['Missing name']
				)
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Missing name')).toBeInTheDocument()
		})

		it('shows warning banner when any rows have errors', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(
					2,
					{
						name: '',
						address: '456 Oak',
						city: 'LA',
						state: 'CA',
						postal_code: '90001'
					},
					['Missing name']
				)
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// New UI shows "X row(s) need attention" instead of "some rows have errors"
			expect(screen.getByText(/need attention/i)).toBeInTheDocument()
		})

		it('does not show warning banner when all rows are valid', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// New UI shows "need attention" instead of "some rows have errors"
			expect(screen.queryByText(/need attention/i)).not.toBeInTheDocument()
		})

		it('shows only first error when row has multiple errors', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: '',
						address: '',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					['Missing name', 'Missing address']
				)
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// Should show first error
			expect(screen.getByText('Missing name')).toBeInTheDocument()
			// Should not show second error in the status column
			expect(screen.queryByText('Missing address')).not.toBeInTheDocument()
		})
	})

	describe('Row Numbers', () => {
		it('displays correct row numbers', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				}),
				createParsedRow(3, {
					name: 'Property 3',
					address: '789 Pine',
					city: 'CHI',
					state: 'IL',
					postal_code: '60601'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			// New UI shows row numbers with # prefix
			expect(screen.getByText('#1')).toBeInTheDocument()
			expect(screen.getByText('#2')).toBeInTheDocument()
			expect(screen.getByText('#3')).toBeInTheDocument()
		})
	})

	describe('Multiple Rows', () => {
		it('renders all provided rows', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property A',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property B',
					address: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				}),
				createParsedRow(3, {
					name: 'Property C',
					address: '789 Pine',
					city: 'CHI',
					state: 'IL',
					postal_code: '60601'
				})
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Property A')).toBeInTheDocument()
			expect(screen.getByText('Property B')).toBeInTheDocument()
			expect(screen.getByText('Property C')).toBeInTheDocument()
		})

		it('handles mix of valid and invalid rows', () => {
			const file = createMockFile('test.csv', 1024)
			const parsedData: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Valid Property',
					address: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(
					2,
					{
						name: '',
						address: '456 Oak',
						city: 'LA',
						state: 'CA',
						postal_code: '90001'
					},
					['Missing name']
				)
			]

			render(<BulkImportValidateStep file={file} parsedData={parsedData} />)

			expect(screen.getByText('Valid')).toBeInTheDocument()
			expect(screen.getByText('Missing name')).toBeInTheDocument()
		})
	})
})
