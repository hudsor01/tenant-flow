/**
 * Unit Tests: BulkImportConfirmStep Component
 *
 * Tests the confirmation step of the bulk import dialog:
 * - Shows progress during import with X of Y display
 * - Displays success state
 * - Displays failure state with error details
 *
 * @vitest-environment jsdom
 */

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { BulkImportConfirmStep } from '../bulk-import-confirm-step'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { BulkImportResult, ImportProgress } from '#types/api-contracts'

describe('BulkImportConfirmStep Component', () => {
	const createProgress = (current: number, total: number, succeeded?: number, failed?: number): ImportProgress => ({
		current,
		total,
		succeeded: succeeded ?? current,
		failed: failed ?? 0,
	})

	describe('Importing State', () => {
		it('shows importing message when importing', () => {
			render(
				<BulkImportConfirmStep
					isImporting={true}
					importProgress={createProgress(3, 10)}
					result={null}
				/>
			)

			expect(screen.getByText(/importing properties/i)).toBeInTheDocument()
		})

		it('shows X of Y progress display', () => {
			render(
				<BulkImportConfirmStep
					isImporting={true}
					importProgress={createProgress(5, 10)}
					result={null}
				/>
			)

			expect(screen.getByText('5/10')).toBeInTheDocument()
			expect(screen.getByText(/importing property 5 of 10/i)).toBeInTheDocument()
		})

		it('renders progress indicator when importing', () => {
			const { container } = render(
				<BulkImportConfirmStep
					isImporting={true}
					importProgress={createProgress(3, 10)}
					result={null}
				/>
			)

			// Progress component should be rendered
			expect(
				container.querySelector('[role="progressbar"]')
			).toBeInTheDocument()
		})

		it('shows succeeded and failed counts', () => {
			render(
				<BulkImportConfirmStep
					isImporting={true}
					importProgress={createProgress(5, 10, 4, 1)}
					result={null}
				/>
			)

			expect(screen.getByText(/4 succeeded/)).toBeInTheDocument()
			expect(screen.getByText(/1 failed/)).toBeInTheDocument()
		})

		it('shows preparing message when importProgress is null', () => {
			render(
				<BulkImportConfirmStep
					isImporting={true}
					importProgress={null}
					result={null}
				/>
			)

			expect(screen.getByText(/preparing import/i)).toBeInTheDocument()
		})
	})

	describe('Success State', () => {
		it('shows success message with imported count (singular)', () => {
			const result: BulkImportResult = {
				success: true,
				imported: 1,
				failed: 0,
				errors: []
			}

			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			expect(screen.getByText(/import successful/i)).toBeInTheDocument()
			expect(screen.getByText('1')).toBeInTheDocument()
			expect(screen.getByText(/property imported/i)).toBeInTheDocument()
		})

		it('shows success message with imported count (plural)', () => {
			const result: BulkImportResult = {
				success: true,
				imported: 5,
				failed: 0,
				errors: []
			}

			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			expect(screen.getByText(/import successful/i)).toBeInTheDocument()
			expect(screen.getByText('5')).toBeInTheDocument()
			expect(screen.getByText(/properties imported/i)).toBeInTheDocument()
		})

		it('applies success styling to result panel', () => {
			const result: BulkImportResult = {
				success: true,
				imported: 3,
				failed: 0,
				errors: []
			}

			const { container } = render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			const successPanel = container.querySelector('[class*="border-success"]')
			expect(successPanel).toBeInTheDocument()
		})
	})

	describe('Failure State', () => {
		it('shows failure message with failed count (singular)', () => {
			const result: BulkImportResult = {
				success: false,
				imported: 0,
				failed: 1,
				errors: [{ row: 1, error: 'Invalid data' }]
			}

			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			expect(screen.getByText(/import failed/i)).toBeInTheDocument()
			expect(screen.getByText('1')).toBeInTheDocument()
			expect(screen.getByText(/row failed/i)).toBeInTheDocument()
		})

		it('shows failure message with failed count (plural)', () => {
			const result: BulkImportResult = {
				success: false,
				imported: 0,
				failed: 3,
				errors: [
					{ row: 1, error: 'Invalid data' },
					{ row: 2, error: 'Missing field' },
					{ row: 3, error: 'Duplicate entry' }
				]
			}

			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			expect(screen.getByText(/import failed/i)).toBeInTheDocument()
			expect(screen.getByText('3')).toBeInTheDocument()
			expect(screen.getByText(/rows failed/i)).toBeInTheDocument()
		})

		it('applies failure styling to result panel', () => {
			const result: BulkImportResult = {
				success: false,
				imported: 0,
				failed: 2,
				errors: []
			}

			const { container } = render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			const failurePanel = container.querySelector(
				'[class*="border-destructive"]'
			)
			expect(failurePanel).toBeInTheDocument()
		})
	})

	describe('No Result State', () => {
		it('does not show result panel when result is null and not importing', () => {
			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={null}
				/>
			)

			expect(screen.queryByText(/import successful/i)).not.toBeInTheDocument()
			expect(screen.queryByText(/import failed/i)).not.toBeInTheDocument()
		})
	})

	describe('Edge Cases', () => {
		it('handles zero imported and zero failed', () => {
			const result: BulkImportResult = {
				success: false,
				imported: 0,
				failed: 0,
				errors: []
			}

			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={result}
				/>
			)

			expect(screen.getByText(/import failed/i)).toBeInTheDocument()
		})

		it('does not show importing state when isImporting is false', () => {
			render(
				<BulkImportConfirmStep
					isImporting={false}
					importProgress={null}
					result={null}
				/>
			)

			expect(
				screen.queryByText(/importing properties/i)
			).not.toBeInTheDocument()
		})
	})
})
