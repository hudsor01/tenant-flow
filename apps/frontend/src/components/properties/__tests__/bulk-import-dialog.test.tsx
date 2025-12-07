/**
 * Unit Tests: PropertyBulkImportDialog Component
 *
 * Tests the main bulk import dialog:
 * - Opens and closes dialog
 * - Renders trigger button
 * - Integrates with modal store
 *
 * @vitest-environment jsdom
 */

import { render, screen, within } from '#test/utils/test-render'
import { PropertyBulkImportDialog } from '../bulk-import-dialog'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// Mock the modal store
const mockOpenModal = vi.fn()
const mockCloseModal = vi.fn()
const mockIsModalOpen = vi.fn()

vi.mock('#stores/modal-store', () => ({
	useModalStore: () => ({
		openModal: mockOpenModal,
		closeModal: mockCloseModal,
		isModalOpen: mockIsModalOpen
	})
}))

// Mock the BulkImportStepper to isolate dialog tests
vi.mock('../bulk-import-stepper', () => ({
	BulkImportStepper: ({
		currentStep,
		modalId
	}: {
		currentStep: string
		onStepChange: (step: string) => void
		modalId: string
	}) => (
		<div data-testid="bulk-import-stepper">
			<span>Step: {currentStep}</span>
			<span>Modal: {modalId}</span>
		</div>
	)
}))

describe('PropertyBulkImportDialog Component', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockIsModalOpen.mockReturnValue(false)
	})

	describe('Trigger Button', () => {
		it('renders bulk import button', () => {
			render(<PropertyBulkImportDialog />)

			expect(
				screen.getByRole('button', { name: /bulk import/i })
			).toBeInTheDocument()
		})

		it('shows FileUp icon in button', () => {
			render(<PropertyBulkImportDialog />)

			const button = screen.getByRole('button', { name: /bulk import/i })
			const icon = button.querySelector('svg')
			expect(icon).toBeInTheDocument()
		})

		it('opens modal when button is clicked', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			const button = screen.getByRole('button', { name: /bulk import/i })
			await user.click(button)

			expect(mockOpenModal).toHaveBeenCalledWith(
				'bulk-import-properties',
				{},
				expect.objectContaining({
					type: 'dialog',
					size: 'lg',
					animationVariant: 'fade',
					closeOnOutsideClick: true,
					closeOnEscape: true
				})
			)
		})
	})

	describe('Dialog State', () => {
		it('does not render dialog content when closed', () => {
			mockIsModalOpen.mockReturnValue(false)
			render(<PropertyBulkImportDialog />)

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		})

		it('renders dialog when open', () => {
			mockIsModalOpen.mockReturnValue(true)
			render(<PropertyBulkImportDialog />)

			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})

		it('renders dialog title when open', () => {
			mockIsModalOpen.mockReturnValue(true)
			render(<PropertyBulkImportDialog />)

			const dialog = screen.getByRole('dialog')
			expect(within(dialog).getByText('Import Properties')).toBeInTheDocument()
		})

		it('renders dialog description when open', () => {
			mockIsModalOpen.mockReturnValue(true)
			render(<PropertyBulkImportDialog />)

			expect(
				screen.getByText(/upload a csv file to add multiple properties/i)
			).toBeInTheDocument()
		})

		it('renders stepper component when dialog is open', () => {
			mockIsModalOpen.mockReturnValue(true)
			render(<PropertyBulkImportDialog />)

			expect(screen.getByTestId('bulk-import-stepper')).toBeInTheDocument()
		})
	})

	describe('Stepper Integration', () => {
		it('passes current step and modal ID to stepper', () => {
			mockIsModalOpen.mockReturnValue(true)
			render(<PropertyBulkImportDialog />)

			const stepper = screen.getByTestId('bulk-import-stepper')
			expect(within(stepper).getByText(/step: upload/i)).toBeInTheDocument()
			expect(
				within(stepper).getByText(/modal: bulk-import-properties/i)
			).toBeInTheDocument()
		})
	})

	describe('Modal ID', () => {
		it('uses correct modal ID for open check', () => {
			render(<PropertyBulkImportDialog />)

			expect(mockIsModalOpen).toHaveBeenCalledWith('bulk-import-properties')
		})
	})
})
