/**
 * Unit Tests: BulkImportValidateStep Component
 *
 * Tests the validation step of the bulk import dialog:
 * - Displays file information
 * - Shows preview table with parsed data
 * - Highlights rows with validation errors
 * - Shows appropriate status indicators
 * - Shows tooManyRows warning banner
 * - Shows structured per-field errors
 *
 * @vitest-environment jsdom
 */

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { BulkImportValidateStep } from '../bulk-import-validate-step'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { ParsedRow } from '#types/api-contracts'

describe('BulkImportValidateStep Component', () => {
	const createMockFile = (name: string, _size: number) => {
		return new File(['content'], name, { type: 'text/csv' })
	}

	const createParsedRow = (
		row: number,
		data: Partial<Record<string, string>>,
		errors: Array<{ field: string; message: string }> = []
	): ParsedRow => ({
		row,
		data: {
			name: data.name || '',
			address_line1: data.address_line1 || '',
			city: data.city || '',
			state: data.state || '',
			postal_code: data.postal_code || '',
			property_type: data.property_type || '',
			...data
		},
		errors,
		parsed: errors.length === 0 ? {
			name: data.name || '',
			address_line1: data.address_line1 || '',
			city: data.city || '',
			state: data.state || 'NY',
			postal_code: data.postal_code || '10001',
			property_type: 'APARTMENT' as const,
			status: 'active' as const,
			country: 'US',
		} : null
	})

	const wrapParseResult = (rows: ParsedRow[], tooManyRows = false, totalRowCount?: number) => ({
		rows,
		tooManyRows,
		totalRowCount: totalRowCount ?? rows.length,
	})

	describe('File Information', () => {
		it('displays file name', () => {
			const file = createMockFile('properties.csv', 1024)

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult([])} />)

			expect(screen.getByText('properties.csv')).toBeInTheDocument()
		})

		it('displays file size in KB', () => {
			const file = new File(['x'.repeat(2048)], 'test.csv', {
				type: 'text/csv'
			})

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult([])} />)

			expect(screen.getByText(/kb/i)).toBeInTheDocument()
		})

		it('shows file check icon', () => {
			const file = createMockFile('test.csv', 1024)

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult([])} />)

			// FileCheck icon should be present (via lucide-react)
			const iconContainer = document.querySelector('.icon-container-md')
			expect(iconContainer).toBeInTheDocument()
		})
	})

	describe('Preview Table', () => {
		it('shows preview row count', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address_line1: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Data Preview')).toBeInTheDocument()
			expect(screen.getByText('2 rows')).toBeInTheDocument()
		})

		it('renders table headers', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Row')).toBeInTheDocument()
			expect(screen.getByText('Name')).toBeInTheDocument()
			expect(screen.getByText('Address Line 1')).toBeInTheDocument()
			expect(screen.getByText('City')).toBeInTheDocument()
			expect(screen.getByText('State')).toBeInTheDocument()
			expect(screen.getByText('Type')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
		})

		it('displays row data correctly', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Test Property',
					address_line1: '123 Main St',
					city: 'New York',
					state: 'NY',
					postal_code: '10001',
					property_type: 'APARTMENT'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Test Property')).toBeInTheDocument()
			expect(screen.getByText('123 Main St')).toBeInTheDocument()
			expect(screen.getByText('New York')).toBeInTheDocument()
			expect(screen.getByText('NY')).toBeInTheDocument()
			expect(screen.getByText('APARTMENT')).toBeInTheDocument()
		})

		it('shows em dash for missing optional data', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: 'Property',
						address_line1: '',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					[{ field: 'address_line1', message: 'Missing address' }]
				)
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			// Uses em dash for empty fields
			const emDashes = screen.getAllByText('\u2014')
			expect(emDashes.length).toBeGreaterThan(0)
		})

		it('shows "No data to preview" when parseResult has empty rows', () => {
			const file = createMockFile('test.csv', 1024)

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult([])} />)

			expect(screen.getByText(/no data to preview/i)).toBeInTheDocument()
		})

		it('shows "No data to preview" when parseResult is null', () => {
			const file = createMockFile('test.csv', 1024)

			render(<BulkImportValidateStep file={file} parseResult={null} />)

			expect(screen.getByText(/no data to preview/i)).toBeInTheDocument()
		})
	})

	describe('Validation Status', () => {
		it('shows "Valid" status for rows without errors', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Valid')).toBeInTheDocument()
		})

		it('shows structured error with field name for rows with errors', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: '',
						address_line1: '123 Main',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					[{ field: 'name', message: 'Missing name' }]
				)
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('name:')).toBeInTheDocument()
			expect(screen.getByText('Missing name')).toBeInTheDocument()
		})

		it('shows all errors for rows with multiple errors', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(
					1,
					{
						name: '',
						address_line1: '',
						city: 'NYC',
						state: 'NY',
						postal_code: '10001'
					},
					[
						{ field: 'name', message: 'Missing name' },
						{ field: 'address_line1', message: 'Missing address' }
					]
				)
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			// Both errors should be shown with structured display
			expect(screen.getByText('name:')).toBeInTheDocument()
			expect(screen.getByText('Missing name')).toBeInTheDocument()
			expect(screen.getByText('address_line1:')).toBeInTheDocument()
			expect(screen.getByText('Missing address')).toBeInTheDocument()
		})

		it('shows error banner when any rows have errors', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(
					2,
					{
						name: '',
						address_line1: '456 Oak',
						city: 'LA',
						state: 'CA',
						postal_code: '90001'
					},
					[{ field: 'name', message: 'Missing name' }]
				)
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText(/have errors/i)).toBeInTheDocument()
			expect(screen.getByText(/all rows must be valid before importing/i)).toBeInTheDocument()
		})

		it('does not show error banner when all rows are valid', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address_line1: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.queryByText(/have errors/i)).not.toBeInTheDocument()
		})
	})

	describe('Too Many Rows Warning', () => {
		it('shows warning banner when tooManyRows is true', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(
				<BulkImportValidateStep
					file={file}
					parseResult={wrapParseResult(rows, true, 150)}
				/>
			)

			expect(screen.getByText(/too many rows/i)).toBeInTheDocument()
			expect(screen.getByText(/150 rows/)).toBeInTheDocument()
			expect(screen.getByText(/maximum is 100/i)).toBeInTheDocument()
		})

		it('does not show warning when tooManyRows is false', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				})
			]

			render(
				<BulkImportValidateStep
					file={file}
					parseResult={wrapParseResult(rows, false)}
				/>
			)

			expect(screen.queryByText(/too many rows/i)).not.toBeInTheDocument()
		})
	})

	describe('Row Numbers', () => {
		it('displays correct row numbers', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property 1',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property 2',
					address_line1: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				}),
				createParsedRow(3, {
					name: 'Property 3',
					address_line1: '789 Pine',
					city: 'CHI',
					state: 'IL',
					postal_code: '60601'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('#1')).toBeInTheDocument()
			expect(screen.getByText('#2')).toBeInTheDocument()
			expect(screen.getByText('#3')).toBeInTheDocument()
		})
	})

	describe('Multiple Rows', () => {
		it('renders all provided rows', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Property A',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(2, {
					name: 'Property B',
					address_line1: '456 Oak',
					city: 'LA',
					state: 'CA',
					postal_code: '90001'
				}),
				createParsedRow(3, {
					name: 'Property C',
					address_line1: '789 Pine',
					city: 'CHI',
					state: 'IL',
					postal_code: '60601'
				})
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Property A')).toBeInTheDocument()
			expect(screen.getByText('Property B')).toBeInTheDocument()
			expect(screen.getByText('Property C')).toBeInTheDocument()
		})

		it('handles mix of valid and invalid rows', () => {
			const file = createMockFile('test.csv', 1024)
			const rows: ParsedRow[] = [
				createParsedRow(1, {
					name: 'Valid Property',
					address_line1: '123 Main',
					city: 'NYC',
					state: 'NY',
					postal_code: '10001'
				}),
				createParsedRow(
					2,
					{
						name: '',
						address_line1: '456 Oak',
						city: 'LA',
						state: 'CA',
						postal_code: '90001'
					},
					[{ field: 'name', message: 'Missing name' }]
				)
			]

			render(<BulkImportValidateStep file={file} parseResult={wrapParseResult(rows)} />)

			expect(screen.getByText('Valid')).toBeInTheDocument()
			expect(screen.getByText('Missing name')).toBeInTheDocument()
		})
	})
})
