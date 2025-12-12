/**
 * Unit Tests: PropertyBulkImportDialog Component
 *
 * Tests the main bulk import dialog:
 * - Opens and closes dialog
 * - Renders trigger button
 * - Uses useState for dialog state (no modal-store)
 *
 * @vitest-environment jsdom
 */

import { render, screen, within } from '#test/utils/test-render'
import { PropertyBulkImportDialog } from '../bulk-import-dialog'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

// Mock the BulkImportStepper to isolate dialog tests
vi.mock('../bulk-import-stepper', () => ({
	BulkImportStepper: ({
		currentStep
	}: {
		currentStep: string
		onStepChange: (step: string) => void
		onComplete: () => void
	}) => (
		<div data-testid="bulk-import-stepper">
			<span>Step: {currentStep}</span>
		</div>
	)
}))

describe('PropertyBulkImportDialog Component', () => {
	beforeEach(() => {
		vi.clearAllMocks()
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

		it('opens dialog when button is clicked', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			const button = screen.getByRole('button', { name: /bulk import/i })
			await user.click(button)

			// Dialog should now be visible
			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})
	})

	describe('Dialog State', () => {
		it('does not render dialog content when closed', () => {
			render(<PropertyBulkImportDialog />)

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		})

		it('renders dialog when open', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))

			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})

		it('renders dialog title when open', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))

			const dialog = screen.getByRole('dialog')
			expect(within(dialog).getByText('Import Properties')).toBeInTheDocument()
		})

		it('renders dialog description when open', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))

			expect(
				screen.getByText(/upload a csv file to add multiple properties/i)
			).toBeInTheDocument()
		})

		it('renders stepper component when dialog is open', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))

			expect(screen.getByTestId('bulk-import-stepper')).toBeInTheDocument()
		})
	})

	describe('Stepper Integration', () => {
		it('passes current step to stepper', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))

			const stepper = screen.getByTestId('bulk-import-stepper')
			expect(within(stepper).getByText(/step: upload/i)).toBeInTheDocument()
		})
	})

	describe('Dialog Close', () => {
		it('closes dialog when clicking outside', async () => {
			const user = userEvent.setup()
			render(<PropertyBulkImportDialog />)

			await user.click(screen.getByRole('button', { name: /bulk import/i }))
			expect(screen.getByRole('dialog')).toBeInTheDocument()

			// Press Escape to close (standard Radix Dialog behavior)
			await user.keyboard('{Escape}')

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		})
	})
})
