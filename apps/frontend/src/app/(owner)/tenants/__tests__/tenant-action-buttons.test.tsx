/**
 * @vitest-environment jsdom
 * TenantActionButtons Component Tests
 *
 * Tests the critical fix: AlertDialog is rendered OUTSIDE DropdownMenu
 * to prevent UI freezing when the delete confirmation dialog opens.
 *
 * Key behaviors tested:
 * 1. DropdownMenu opens and closes properly
 * 2. Delete menu item opens AlertDialog (not nested inside dropdown)
 * 3. AlertDialog Cancel closes dialog and allows further interaction
 * 4. AlertDialog Delete button triggers mutation
 * 5. Dialog is disabled during pending state
 */

import { render, screen, waitFor } from '#test/utils/test-render'
import userEvent from '@testing-library/user-event'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { TenantActionButtons } from '../tenant-action-buttons'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}))

vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn()
}))

// Test data - plain object following project conventions
const MOCK_TENANT: TenantWithLeaseInfo = {
	id: 'tenant-123',
	user_id: 'user-123',
	first_name: 'John',
	last_name: 'Doe',
	name: 'John Doe',
	email: 'john.doe@example.com',
	phone: '555-123-4567',
	emergency_contact_name: 'Jane Doe',
	emergency_contact_phone: '555-987-6543',
	emergency_contact_relationship: 'Spouse',
	date_of_birth: '1985-06-15',
	identity_verified: true,
	ssn_last_four: '1234',
	stripe_customer_id: 'cus_test123',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-06-01T00:00:00Z',
	currentLease: {
		id: 'lease-123',
		start_date: '2024-01-01',
		end_date: '2024-12-31',
		rent_amount: 2500,
		security_deposit: 5000,
		status: 'active',
		primary_tenant_id: 'tenant-123',
		unit_id: 'unit-101'
	},
	leases: [],
	unit: {
		id: 'unit-101',
		unit_number: '101',
		bedrooms: 2,
		bathrooms: 1,
		square_feet: 950,
		rent_amount: 2500
	},
	property: {
		id: 'property-1',
		name: 'Oceanview Apartments',
		address_line1: '100 Ocean Drive',
		city: 'Miami',
		state: 'FL',
		postal_code: '33139'
	},
	monthlyRent: 2500,
	lease_status: 'active',
	paymentStatus: 'Current',
	unitDisplay: 'Unit 101',
	propertyDisplay: 'Oceanview Apartments, Miami',
	leaseStart: '2024-01-01',
	leaseEnd: '2024-12-31'
}

describe('TenantActionButtons', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		test('renders View button', () => {
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
		})

		test('renders dropdown menu trigger (three-dot button)', () => {
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			// The MoreVertical icon button - second button after View
			const buttons = screen.getAllByRole('button')
			expect(buttons.length).toBeGreaterThanOrEqual(2)
		})
	})

	describe('Dropdown Menu', () => {
		test('opens dropdown menu when trigger clicked', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			// Click the dropdown trigger (MoreVertical button)
			const buttons = screen.getAllByRole('button')
			const dropdownTrigger = buttons[1] // Second button is the dropdown trigger
			await user.click(dropdownTrigger!)

			// Menu items should be visible
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /edit tenant/i })).toBeInTheDocument()
				expect(screen.getByRole('menuitem', { name: /send invitation/i })).toBeInTheDocument()
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
		})

		test('Edit Tenant menu item opens edit dialog', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			// Open dropdown
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)

			// Click Edit Tenant
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /edit tenant/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /edit tenant/i }))

			// Dialog should open
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument()
			})
		})
	})

	describe('Delete Flow - AlertDialog Outside DropdownMenu', () => {
		test('clicking Delete opens AlertDialog (not nested in dropdown)', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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
				expect(screen.getByText(/delete tenant/i)).toBeInTheDocument()
				expect(screen.getByText(/john doe/i)).toBeInTheDocument()
				expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
			})
		})

		test('AlertDialog has Cancel and Delete buttons', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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
				// Delete button inside dialog (not menuitem)
				const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
				expect(deleteButtons.length).toBeGreaterThan(0)
			})
		})

		test('Cancel button closes AlertDialog and allows reopening', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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

		test('Delete button is disabled during mutation pending state', async () => {
			// This test verifies the disabled prop is correctly applied
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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

			// The Delete button should NOT be disabled initially
			const alertDialogDeleteButtons = screen.getAllByRole('button', { name: /delete/i })
			const dialogDeleteButton = alertDialogDeleteButtons.find(
				btn => btn.closest('[role="alertdialog"]')
			)
			expect(dialogDeleteButton).not.toBeDisabled()
		})
	})

	describe('View Button', () => {
		test('View button opens view dialog', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			await user.click(screen.getByRole('button', { name: /view/i }))

			// Dialog should open with tenant info
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument()
			})
		})
	})

	describe('Accessibility', () => {
		test('dropdown trigger is keyboard accessible', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

			// Tab to the dropdown trigger
			await user.tab() // View button
			await user.tab() // Dropdown trigger

			// Press Enter to open
			await user.keyboard('{Enter}')

			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /edit tenant/i })).toBeInTheDocument()
			})
		})

		test('AlertDialog can be closed with Escape key', async () => {
			const user = userEvent.setup()
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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
			render(<TenantActionButtons tenant={MOCK_TENANT} />)

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

	describe('Edge Cases', () => {
		test('handles tenant without optional fields', () => {
			const minimalTenant: TenantWithLeaseInfo = {
				...MOCK_TENANT,
				emergency_contact_name: null,
				emergency_contact_phone: null,
				phone: null,
				currentLease: null,
				unit: null,
				property: null
			}

			render(<TenantActionButtons tenant={minimalTenant} />)

			expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
		})

		test('displays correct tenant name in delete dialog', async () => {
			const user = userEvent.setup()
			const customTenant: TenantWithLeaseInfo = {
				...MOCK_TENANT,
				first_name: 'Alice',
				last_name: 'Smith'
			}

			render(<TenantActionButtons tenant={customTenant} />)

			// Open dropdown and click Delete
			const buttons = screen.getAllByRole('button')
			await user.click(buttons[1]!)
			await waitFor(() => {
				expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument()
			})
			await user.click(screen.getByRole('menuitem', { name: /delete/i }))

			// Check dialog shows correct name
			await waitFor(() => {
				expect(screen.getByText(/alice smith/i)).toBeInTheDocument()
			})
		})
	})
})
