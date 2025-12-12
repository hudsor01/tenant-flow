/**
 * @vitest-environment jsdom
 * LeaseActionButtons Component Tests
 *
 * Tests the critical fix: AlertDialog is rendered OUTSIDE DropdownMenu
 * to prevent UI freezing when the delete confirmation dialog opens.
 *
 * Key behaviors tested:
 * 1. DropdownMenu opens and closes properly
 * 2. Status-conditional menu items (draft, pending_signature, active)
 * 3. Delete menu item opens AlertDialog (not nested inside dropdown)
 * 4. AlertDialog Cancel closes dialog and allows further interaction
 * 5. Dialog properly shows toast on delete (TODO: implement mutation)
 */

import { render, screen, waitFor } from '#test/utils/test-render'
import userEvent from '@testing-library/user-event'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeaseActionButtons } from '../lease-action-buttons'
import type { Lease } from '@repo/shared/types/core'
import { LEASE_STATUS } from '#lib/constants/status-values'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}))

// Mock lease hooks
const mockSendForSignature = {
	mutateAsync: vi.fn(),
	isPending: false
}

const mockSignAsOwner = {
	mutateAsync: vi.fn(),
	isPending: false
}

const mockDeleteLease = {
	mutate: vi.fn(),
	mutateAsync: vi.fn(),
	isPending: false
}

vi.mock('#hooks/api/use-lease', () => ({
	useSendLeaseForSignature: () => mockSendForSignature,
	useSignLeaseAsOwner: () => mockSignAsOwner,
	useDeleteLease: (options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
		mockDeleteLease.mutate.mockImplementation(() => options?.onSuccess?.())
		mockDeleteLease.mutateAsync.mockImplementation(async () => options?.onSuccess?.())
		return mockDeleteLease
	}
}))

// Base lease data - plain object following project conventions
const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
	id: 'lease-123',
	unit_id: 'unit-101',
	primary_tenant_id: 'tenant-123',
	property_owner_id: 'owner-123',
	start_date: '2024-01-01',
	end_date: '2024-12-31',
	rent_amount: 2500,
	rent_currency: 'USD',
	security_deposit: 5000,
	lease_status: 'active',
	payment_day: 1,
	stripe_subscription_id: null,
	stripe_subscription_status: 'none',
	subscription_failure_reason: null,
	subscription_retry_count: 0,
	subscription_last_attempt_at: null,
	auto_pay_enabled: null,
	grace_period_days: null,
	late_fee_amount: null,
	late_fee_days: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-06-01T00:00:00Z',
	docuseal_submission_id: null,
	owner_signed_at: null,
	owner_signature_ip: null,
	owner_signature_method: null,
	tenant_signed_at: null,
	tenant_signature_ip: null,
	tenant_signature_method: null,
	sent_for_signature_at: null,
	max_occupants: null,
	pets_allowed: null,
	pet_deposit: null,
	pet_rent: null,
	utilities_included: null,
	tenant_responsible_utilities: null,
	property_rules: null,
	property_built_before_1978: null,
	lead_paint_disclosure_acknowledged: null,
	governing_state: null,
	...overrides
})

describe('LeaseActionButtons', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSendForSignature.isPending = false
		mockSignAsOwner.isPending = false
		mockDeleteLease.isPending = false
		mockDeleteLease.mutate.mockImplementation(() => {})
		mockDeleteLease.mutateAsync.mockImplementation(async () => {})
	})

	describe('Rendering', () => {
		test('renders View button', () => {
			render(<LeaseActionButtons lease={createMockLease()} />)

			expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
		})

		test('renders dropdown menu trigger', () => {
			render(<LeaseActionButtons lease={createMockLease()} />)

			const buttons = screen.getAllByRole('button')
			expect(buttons.length).toBeGreaterThanOrEqual(2)
		})

		test('renders status badge', () => {
			render(<LeaseActionButtons lease={createMockLease({ lease_status: 'active' })} />)

			expect(screen.getByText('active')).toBeInTheDocument()
		})
	})

	describe('Dropdown Menu - Status Conditional Items', () => {
		test('shows Send for Signature for draft leases', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease({ lease_status: LEASE_STATUS.DRAFT })} />)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /send for signature/i })).toBeInTheDocument()
			})
		})

		test('shows Sign as Owner for pending_signature leases without owner signature', async () => {
			const user = userEvent.setup()
			render(
				<LeaseActionButtons
					lease={createMockLease({
						lease_status: LEASE_STATUS.PENDING_SIGNATURE,
						owner_signed_at: null
					})}
				/>
			)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /sign as owner/i })).toBeInTheDocument()
			})
		})

		test('hides Sign as Owner when owner has already signed', async () => {
			const user = userEvent.setup()
			render(
				<LeaseActionButtons
					lease={createMockLease({
						lease_status: LEASE_STATUS.PENDING_SIGNATURE,
						owner_signed_at: '2024-06-01T00:00:00Z'
					})}
				/>
			)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			await waitFor(() => {
				expect(screen.queryByRole('menuitem', { name: /sign as owner/i })).not.toBeInTheDocument()
			})
		})

		test('shows active lease actions (Pay Rent, Renew, Terminate) for active leases', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease({ lease_status: 'active' })} />)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /pay rent/i })).toBeInTheDocument()
				expect(screen.getByRole('menuitem', { name: /renew lease/i })).toBeInTheDocument()
				expect(screen.getByRole('menuitem', { name: /terminate lease/i })).toBeInTheDocument()
			})
		})

		test('always shows Delete menu item regardless of status', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease({ lease_status: LEASE_STATUS.DRAFT })} />)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
		})
	})

	describe('Delete Flow - AlertDialog Outside DropdownMenu', () => {
		test('clicking Delete opens AlertDialog (not nested in dropdown)', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			// Click Delete menu item
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// AlertDialog should open with correct content
			await waitFor(() => {
				expect(screen.getByRole('alertdialog')).toBeInTheDocument()
				expect(screen.getByText(/delete lease/i)).toBeInTheDocument()
				expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
				expect(screen.getByText(/payment records/i)).toBeInTheDocument()
			})
		})

		test('AlertDialog has Cancel and Delete buttons', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dropdown and click Delete
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// Check dialog buttons
			await waitFor(() => {
				expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
				const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
				expect(deleteButtons.length).toBeGreaterThan(0)
			})
		})

		test('Cancel button closes AlertDialog and allows reopening', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dropdown and click Delete
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// Wait for dialog to open
			await waitFor(() => {
				expect(screen.getByRole('alertdialog')).toBeInTheDocument()
			})

			// Click Cancel
			await user.click(screen.getByRole('button', { name: /cancel/i }))

			// Dialog should close
			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
			})

			// Should be able to open dropdown again (UI not frozen)
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
		})

		test('Delete button in dialog runs mutation, shows success toast, and closes dialog', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dropdown and click Delete
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// Wait for dialog
			await waitFor(() => {
				expect(screen.getByRole('alertdialog')).toBeInTheDocument()
			})

			// Click Delete in dialog
			const dialogDeleteButton = screen
				.getAllByRole('button', { name: /delete/i })
				.find(btn => btn.closest('[role="alertdialog"]'))
			await user.click(dialogDeleteButton!)

			// Mutation should be triggered and success toast shown
			expect(mockDeleteLease.mutate).toHaveBeenCalled()
			expect(toast.success).toHaveBeenCalledWith('Lease deleted successfully')

			// Dialog should close
			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
			})
		})
	})

	describe('View Button', () => {
		test('View button opens view dialog', async () => {
			const user = userEvent.setup()
			const lease = createMockLease()
			render(<LeaseActionButtons lease={lease} />)

			await user.click(screen.getByRole('button', { name: /view/i }))

			// Dialog should open with lease info
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument()
			})
		})
	})

	describe('Active Lease Actions', () => {
		test('Pay Rent opens dialog', async () => {
			const user = userEvent.setup()
			const lease = createMockLease({ lease_status: 'active' })
			render(<LeaseActionButtons lease={lease} />)

			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /pay rent/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /pay rent/i }))

			// Pay rent dialog should open
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument()
			})
		})

		test('Renew Lease opens dialog', async () => {
			const user = userEvent.setup()
			const lease = createMockLease({ lease_status: 'active' })
			render(<LeaseActionButtons lease={lease} />)

			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /renew lease/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /renew lease/i }))

			// Renew dialog should open
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument()
			})
		})

		test('Terminate Lease opens dialog', async () => {
			const user = userEvent.setup()
			const lease = createMockLease({ lease_status: 'active' })
			render(<LeaseActionButtons lease={lease} />)

			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /terminate lease/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /terminate lease/i }))

			// Terminate dialog should open (AlertDialog has role="alertdialog")
			await waitFor(() => {
				expect(screen.getByRole('alertdialog')).toBeInTheDocument()
			})
		})
	})

	describe('Accessibility', () => {
		test('dropdown trigger is keyboard accessible', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			await user.tab() // View button
			await user.tab() // Dropdown trigger
			await user.keyboard('{Enter}')

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
		})

		test('AlertDialog can be closed with Escape key', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dropdown and click Delete
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// Wait for dialog
			await waitFor(() => {
				expect(screen.getByRole('alertdialog')).toBeInTheDocument()
			})

			// Press Escape
			await user.keyboard('{Escape}')

			// Dialog should close
			await waitFor(() => {
				expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
			})
		})

		test('AlertDialog has proper ARIA attributes', async () => {
			const user = userEvent.setup()
			render(<LeaseActionButtons lease={createMockLease()} />)

			// Open dialog
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			await waitFor(() => {
				const dialog = screen.getByRole('alertdialog')
				// Radix AlertDialog provides aria-labelledby and aria-describedby for accessibility
				expect(dialog).toHaveAttribute('aria-labelledby')
				expect(dialog).toHaveAttribute('aria-describedby')
			})
		})
	})

	describe('Status Badge Display', () => {
		test('displays "Pending Signature" label for pending_signature status', () => {
			render(
				<LeaseActionButtons lease={createMockLease({ lease_status: LEASE_STATUS.PENDING_SIGNATURE })} />
			)

			expect(screen.getByText('Pending Signature')).toBeInTheDocument()
		})

		test('displays raw status for unrecognized statuses', () => {
			render(<LeaseActionButtons lease={createMockLease({ lease_status: 'active' })} />)

			expect(screen.getByText('active')).toBeInTheDocument()
		})
	})
})
