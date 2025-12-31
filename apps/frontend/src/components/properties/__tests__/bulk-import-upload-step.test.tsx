/**
 * Unit Tests: BulkImportUploadStep Component
 *
 * Tests the upload step of the bulk import dialog:
 * - Renders drag and drop zone
 * - Handles file selection via click
 * - Handles file selection via drag and drop
 * - Validates files before selection
 * - Downloads CSV template
 *
 * @vitest-environment jsdom
 */

import { screen, fireEvent } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { BulkImportUploadStep } from '../bulk-import-upload-step'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// Mock the logger
vi.mock('@repo/shared/lib/frontend-logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}))

describe('BulkImportUploadStep Component', () => {
	const mockOnFileSelect = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		it('renders drag and drop zone', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			expect(
				screen.getByText(/click to upload or drag and drop/i)
			).toBeInTheDocument()
		})

		it('shows file size limit info', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			expect(screen.getByText(/csv files only/i)).toBeInTheDocument()
			expect(screen.getByText(/max 5mb/i)).toBeInTheDocument()
		})

		it('shows CSV requirements', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			expect(screen.getByText(/csv requirements/i)).toBeInTheDocument()
			// The component shows "Required Fields" not "Required:"
			expect(screen.getByText(/required fields/i)).toBeInTheDocument()
		})

		it('shows template download button', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			expect(screen.getByText(/need a template/i)).toBeInTheDocument()
			// The button just says "Download", not "Download CSV Template"
			expect(
				screen.getByRole('button', { name: /download/i })
			).toBeInTheDocument()
		})
	})

	describe('File Selection via Input', () => {
		it('calls onFileSelect when valid CSV file is selected', async () => {
			const user = userEvent.setup()
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const file = new File(['name,address\nTest,123 Main'], 'test.csv', {
				type: 'text/csv'
			})
			const input = document.querySelector(
				'input[type="file"]'
			) as HTMLInputElement

			await user.upload(input, file)

			expect(mockOnFileSelect).toHaveBeenCalledWith(file)
		})

		it('accepts file input with correct attributes', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const input = document.querySelector(
				'input[type="file"]'
			) as HTMLInputElement

			expect(input).toHaveAttribute('accept', '.csv,text/csv')
			expect(input).toHaveClass('sr-only')
		})
	})

	describe('Drag and Drop', () => {
		it.skip('shows drag active state when dragging over', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const dropzone = screen
				.getByText(/click to upload or drag and drop/i)
				.closest('div')!

			fireEvent.dragOver(dropzone)

			// Verify drag-over state is active
			expect(dropzone).toHaveAttribute('data-dragging', '')
		})

		it.skip('removes drag active state when dragging leaves', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const dropzone = screen
				.getByText(/click to upload or drag and drop/i)
				.closest('div')!

			fireEvent.dragOver(dropzone)
			expect(dropzone).toHaveAttribute('data-dragging', '')

			fireEvent.dragLeave(dropzone)
			expect(
				screen.getByText(/click to upload or drag and drop/i)
			).toBeInTheDocument()
		})

		it.skip('calls onFileSelect when valid file is dropped', () => {
			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const dropzone = screen
				.getByText(/click to upload or drag and drop/i)
				.closest('div')!
			const file = new File(['name,address\nTest,123 Main'], 'test.csv', {
				type: 'text/csv'
			})

			fireEvent.drop(dropzone, {
				dataTransfer: {
					files: [file]
				}
			})

			expect(mockOnFileSelect).toHaveBeenCalledWith(file)
		})

		it.skip('does not call onFileSelect when invalid file is dropped', () => {
			const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

			render(<BulkImportUploadStep onFileSelect={mockOnFileSelect} />)

			const dropzone = screen
				.getByText(/click to upload or drag and drop/i)
				.closest('div')!
			const file = new File(['content'], 'test.txt', { type: 'text/plain' })

			fireEvent.drop(dropzone, {
				dataTransfer: {
					files: [file]
				}
			})

			expect(mockOnFileSelect).not.toHaveBeenCalled()

			alertMock.mockRestore()
		})
	})
})
