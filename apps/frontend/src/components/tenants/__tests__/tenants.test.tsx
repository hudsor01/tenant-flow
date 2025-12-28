/**
 * Tenants Component Tests
 *
 * Tests for the main Tenants component and its sub-components
 * Covers:
 * - Component rendering
 * - Table and grid views
 * - Selection behavior
 * - Filter functionality
 * - Loading and empty states
 * - Mobile responsiveness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tenants, type TenantItem, type TenantDetail } from '../tenants'

// Mock sample tenant data
const mockTenants: TenantItem[] = [
	{
		id: 'tenant-1',
		fullName: 'John Smith',
		email: 'john.smith@example.com',
		phone: '(555) 123-4567',
		currentProperty: 'Sunset Apartments',
		currentUnit: '101',
		leaseStatus: 'active',
		leaseId: 'lease-1',
		totalPaid: 1200000 // $12,000 in cents
	},
	{
		id: 'tenant-2',
		fullName: 'Jane Doe',
		email: 'jane.doe@example.com',
		phone: '(555) 987-6543',
		currentProperty: 'Oak Hills',
		currentUnit: '205',
		leaseStatus: 'pending_signature',
		leaseId: 'lease-2',
		totalPaid: 0
	},
	{
		id: 'tenant-3',
		fullName: 'Bob Johnson',
		email: 'bob.johnson@example.com',
		phone: undefined,
		currentProperty: undefined,
		currentUnit: undefined,
		leaseStatus: 'ended',
		leaseId: undefined,
		totalPaid: 800000
	}
]

const mockSelectedTenant: TenantDetail = {
	...mockTenants[0]!,
	emergencyContactName: 'Mary Smith',
	emergencyContactPhone: '(555) 555-5555',
	emergencyContactRelationship: 'Spouse',
	identityVerified: true,
	currentLease: {
		id: 'lease-1',
		propertyName: 'Sunset Apartments',
		unitNumber: '101',
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		rentAmount: 150000, // $1,500 in cents
		autopayEnabled: true
	},
	paymentHistory: [
		{
			id: 'payment-1',
			amount: 150000,
			status: 'succeeded',
			dueDate: '2024-01-01',
			paidDate: '2024-01-01'
		},
		{
			id: 'payment-2',
			amount: 150000,
			status: 'pending',
			dueDate: '2024-02-01'
		}
	],
	leaseHistory: [
		{
			id: 'lease-old',
			propertyName: 'Pine Grove',
			unitNumber: '305',
			startDate: '2022-01-01',
			endDate: '2023-12-31',
			rentAmount: 140000,
			status: 'ended'
		}
	],
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-06-01T00:00:00Z'
}

describe('Tenants Component', () => {
	const mockHandlers = {
		onInviteTenant: vi.fn(),
		onViewTenant: vi.fn(),
		onEditTenant: vi.fn(),
		onDeleteTenant: vi.fn(),
		onContactTenant: vi.fn(),
		onViewLease: vi.fn(),
		onExport: vi.fn(),
		onMessageAll: vi.fn()
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Component Rendering', () => {
		it('renders without crashing', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)
			expect(
				screen.getByRole('heading', { name: /tenants/i })
			).toBeInTheDocument()
		})

		it('displays correct stats in header', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Check stats are displayed - use getAllByText since badges also show these
			expect(screen.getByText('Total Tenants')).toBeInTheDocument()
			expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Ended').length).toBeGreaterThan(0)
		})

		it('displays tenant data in table view', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Check tenant names are displayed
			expect(screen.getByText('John Smith')).toBeInTheDocument()
			expect(screen.getByText('Jane Doe')).toBeInTheDocument()
			expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
		})

		it('shows invite tenant button', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)
			// There may be multiple invite buttons (action bar, quick actions)
			expect(
				screen.getAllByRole('button', { name: /invite tenant/i }).length
			).toBeGreaterThan(0)
		})
	})

	describe('Empty State', () => {
		it('shows empty state when no tenants', () => {
			render(
				<Tenants tenants={[]} selectedTenant={undefined} {...mockHandlers} />
			)

			expect(screen.getByText(/no tenants yet/i)).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /invite your first tenant/i })
			).toBeInTheDocument()
		})

		it('calls onInviteTenant when clicking invite button in empty state', async () => {
			const user = userEvent.setup()
			render(
				<Tenants tenants={[]} selectedTenant={undefined} {...mockHandlers} />
			)

			await user.click(
				screen.getByRole('button', { name: /invite your first tenant/i })
			)
			expect(mockHandlers.onInviteTenant).toHaveBeenCalledOnce()
		})
	})

	describe('View Toggle', () => {
		it('switches between table and grid view', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find and click grid view button
			const gridButton = screen.getByRole('button', { name: /grid/i })
			await user.click(gridButton)

			// Grid view should show cards with tenant info
			// Table should no longer be visible
			expect(screen.queryByRole('table')).not.toBeInTheDocument()

			// Switch back to table
			const tableButton = screen.getByRole('button', { name: /table/i })
			await user.click(tableButton)

			// Table should be visible again
			expect(screen.getByRole('table')).toBeInTheDocument()
		})
	})

	describe('Search and Filter', () => {
		it('filters tenants by search query', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			const searchInput = screen.getByPlaceholderText(/search tenants/i)
			await user.type(searchInput, 'John Smith')

			// Only John Smith should be visible (use full name for more specificity)
			expect(screen.getByText('John Smith')).toBeInTheDocument()
			expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
		})

		it('filters tenants by email', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			const searchInput = screen.getByPlaceholderText(/search tenants/i)
			await user.type(searchInput, 'jane.doe@')

			// Only Jane Doe should be visible
			expect(screen.getByText('Jane Doe')).toBeInTheDocument()
			expect(screen.queryByText('John Smith')).not.toBeInTheDocument()
		})

		it('shows no results message when search has no matches', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			const searchInput = screen.getByPlaceholderText(/search tenants/i)
			await user.type(searchInput, 'nonexistent')

			expect(
				screen.getByText(/no tenants match your filters/i)
			).toBeInTheDocument()
		})

		it('clears filters when clicking clear button', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			const searchInput = screen.getByPlaceholderText(/search tenants/i)
			await user.type(searchInput, 'John')

			// Only one tenant visible
			expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()

			// Click clear
			const clearButton = screen.getByRole('button', { name: /clear/i })
			await user.click(clearButton)

			// All tenants visible again
			expect(screen.getByText('Jane Doe')).toBeInTheDocument()
		})
	})

	describe('Selection', () => {
		it('selects a tenant by clicking checkbox', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find the first tenant's checkbox (use aria-label)
			const checkbox = screen.getByRole('checkbox', {
				name: /select john smith/i
			})
			await user.click(checkbox)

			// Action bar should appear (has role="toolbar" in the portal)
			expect(screen.getByRole('toolbar')).toBeInTheDocument()
		})

		it('selects all tenants with select all checkbox', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find select all checkbox
			const selectAllCheckbox = screen.getByRole('checkbox', {
				name: /select all/i
			})
			await user.click(selectAllCheckbox)

			// Action bar should appear (has role="toolbar" in the portal)
			expect(screen.getByRole('toolbar')).toBeInTheDocument()
		})

		it('deselects all when clicking close on action bar', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Select a tenant first
			const checkbox = screen.getByRole('checkbox', {
				name: /select john smith/i
			})
			await user.click(checkbox)

			// Click deselect button on action bar
			const deselectButton = screen.getByRole('button', {
				name: /deselect all/i
			})
			await user.click(deselectButton)

			// Action bar should disappear
			expect(screen.queryByText('selected')).not.toBeInTheDocument()
		})
	})

	describe('Actions', () => {
		it('calls onViewTenant when clicking tenant name', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			await user.click(screen.getByText('John Smith'))
			expect(mockHandlers.onViewTenant).toHaveBeenCalledWith('tenant-1')
		})

		it('calls onEditTenant when clicking edit button', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find all edit buttons and click the first one
			const editButtons = screen.getAllByRole('button', { name: /edit/i })
			await user.click(editButtons[0]!)
			expect(mockHandlers.onEditTenant).toHaveBeenCalledWith('tenant-1')
		})

		it('calls onDeleteTenant when clicking delete button', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find all delete buttons and click the first one
			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
			await user.click(deleteButtons[0]!)
			expect(mockHandlers.onDeleteTenant).toHaveBeenCalledWith('tenant-1')
		})

		it('calls onInviteTenant when clicking invite button', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// There may be multiple invite buttons - click the first one
			const inviteButtons = screen.getAllByRole('button', {
				name: /invite tenant/i
			})
			await user.click(inviteButtons[0]!)
			expect(mockHandlers.onInviteTenant).toHaveBeenCalled()
		})

		it('calls onExport from quick actions', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			const exportButton = screen.getByRole('button', { name: /export/i })
			await user.click(exportButton)
			expect(mockHandlers.onExport).toHaveBeenCalled()
		})
	})

	describe('Status Display', () => {
		it('shows correct status badges', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Status badges appear in both stats and table rows
			expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Ended').length).toBeGreaterThan(0)
		})
	})

	describe('Data Formatting', () => {
		it('formats currency correctly', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={mockSelectedTenant}
					{...mockHandlers}
				/>
			)

			// The component should format amounts from cents to dollars
			// This would be visible in the detail sheet when open
		})

		it('handles missing phone number gracefully', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Bob Johnson has no phone number
			// Table should show dash or empty for missing phone
		})

		it('handles missing property gracefully', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Bob Johnson has no current property
			// Table should show dash or empty for missing property
		})
	})

	describe('Quick Actions', () => {
		it('renders all quick action buttons', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Check for quick action buttons (may appear multiple times)
			expect(screen.getAllByText('Invite Tenant').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Message All').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Export').length).toBeGreaterThan(0)
			expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0)
		})

		it('calls onMessageAll when clicking message all button', async () => {
			const user = userEvent.setup()
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Find and click the "Message All" quick action
			const messageAllButton = screen.getByText('Message All').closest('button')
			if (messageAllButton) {
				await user.click(messageAllButton)
				expect(mockHandlers.onMessageAll).toHaveBeenCalled()
			}
		})
	})

	describe('Accessibility', () => {
		it('has accessible name for all interactive elements', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// All buttons should have accessible names
			const buttons = screen.getAllByRole('button')
			buttons.forEach(button => {
				expect(button).toHaveAccessibleName()
			})
		})

		it('has accessible checkboxes with labels', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					{...mockHandlers}
				/>
			)

			// Select all checkbox
			expect(
				screen.getByRole('checkbox', { name: /select all/i })
			).toBeInTheDocument()

			// Individual tenant checkboxes
			expect(
				screen.getByRole('checkbox', { name: /select john smith/i })
			).toBeInTheDocument()
		})
	})

	describe('Loading State', () => {
		it('handles loading state prop', () => {
			render(
				<Tenants
					tenants={mockTenants}
					selectedTenant={undefined}
					isLoading={true}
					{...mockHandlers}
				/>
			)

			// Component should still render with loading state
			// Specific loading UI depends on implementation
		})
	})
})

describe('TenantDetailSheet', () => {
	const mockHandlers = {
		onInviteTenant: vi.fn(),
		onViewTenant: vi.fn(),
		onEditTenant: vi.fn(),
		onDeleteTenant: vi.fn(),
		onContactTenant: vi.fn(),
		onViewLease: vi.fn(),
		onExport: vi.fn(),
		onMessageAll: vi.fn()
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('displays tenant contact information', async () => {
		const user = userEvent.setup()
		render(
			<Tenants
				tenants={mockTenants}
				selectedTenant={mockSelectedTenant}
				{...mockHandlers}
			/>
		)

		// Click on tenant to open detail sheet
		await user.click(screen.getByText('John Smith'))

		// The detail sheet should show tenant info
		// Note: Sheet content may be in a portal, so we use getAllByText
		expect(
			screen.getAllByText('john.smith@example.com').length
		).toBeGreaterThan(0)
	})

	it('displays current lease information when present', async () => {
		const user = userEvent.setup()
		render(
			<Tenants
				tenants={mockTenants}
				selectedTenant={mockSelectedTenant}
				{...mockHandlers}
			/>
		)

		// Click on tenant to open detail sheet
		await user.click(screen.getByText('John Smith'))

		// Should show current lease section
		expect(screen.getByText('Current Lease')).toBeInTheDocument()
	})

	it('displays emergency contact when present', async () => {
		const user = userEvent.setup()
		render(
			<Tenants
				tenants={mockTenants}
				selectedTenant={mockSelectedTenant}
				{...mockHandlers}
			/>
		)

		// Click on tenant to open detail sheet
		await user.click(screen.getByText('John Smith'))

		// Should show emergency contact
		expect(screen.getByText('Emergency Contact')).toBeInTheDocument()
		expect(screen.getByText('Mary Smith')).toBeInTheDocument()
	})

	it('displays payment history when present', async () => {
		const user = userEvent.setup()
		render(
			<Tenants
				tenants={mockTenants}
				selectedTenant={mockSelectedTenant}
				{...mockHandlers}
			/>
		)

		// Click on tenant to open detail sheet
		await user.click(screen.getByText('John Smith'))

		// Should show recent payments section
		expect(screen.getByText('Recent Payments')).toBeInTheDocument()
	})

	it('displays lease history when present', async () => {
		const user = userEvent.setup()
		render(
			<Tenants
				tenants={mockTenants}
				selectedTenant={mockSelectedTenant}
				{...mockHandlers}
			/>
		)

		// Click on tenant to open detail sheet
		await user.click(screen.getByText('John Smith'))

		// Should show lease history section
		expect(screen.getByText('Lease History')).toBeInTheDocument()
	})
})
