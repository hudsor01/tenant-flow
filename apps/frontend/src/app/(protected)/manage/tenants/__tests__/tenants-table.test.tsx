/**
 * @vitest-environment jsdom
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '#test/utils'
import { TenantsTableClient } from '../tenants-table.client'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ColumnDef } from '@tanstack/react-table'

// Mock API client
vi.mock('#lib/api/client', () => ({
	clientFetch: vi.fn().mockResolvedValue({})
}))

// Mock hooks
vi.mock('#hooks/api/use-tenant', () => ({
	useResendInvitation: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}))

// Mock sonner toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

// Mock next/link
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	)
}))

const MOCK_COLUMNS: ColumnDef<TenantWithLeaseInfo>[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	},
	{
		accessorKey: 'email',
		header: 'Email'
	},
	{
		accessorKey: 'invitation_status',
		header: 'Status'
	}
]

const MOCK_TENANTS: TenantWithLeaseInfo[] = [
	{
		id: 'tenant-1',
		name: 'John Doe',
		email: 'john@example.com',
		phone: '555-0001',
		avatarUrl: null,
		emergencyContact: null,
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
		invitation_status: 'ACCEPTED',
		invitation_sent_at: '2024-01-01',
		invitation_accepted_at: '2024-01-01',
		invitation_expires_at: null,
		currentLease: {
			id: 'lease-1',
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			rentAmount: 1500,
			securityDeposit: 1500,
			status: 'ACTIVE',
			terms: null
		},
		unit: {
			id: 'unit-1',
			unitNumber: '101',
			bedrooms: 2,
			bathrooms: 1,
			squareFootage: 850
		},
		property: {
			id: 'property-1',
			name: 'Sunset Apartments',
			address: '123 Main St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94105'
		},
		monthlyRent: 1500,
		leaseStatus: 'ACTIVE',
		paymentStatus: null,
		unitDisplay: 'Unit 101',
		propertyDisplay: 'Sunset Apartments',
		leaseStart: '2024-01-01',
		leaseEnd: '2024-12-31'
	},
	{
		id: 'tenant-2',
		name: 'Jane Smith',
		email: 'jane@example.com',
		phone: '555-0002',
		avatarUrl: null,
		emergencyContact: null,
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
		invitation_status: 'ACCEPTED',
		invitation_sent_at: '2024-01-01',
		invitation_accepted_at: '2024-01-01',
		invitation_expires_at: null,
		currentLease: {
			id: 'lease-2',
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			rentAmount: 1600,
			securityDeposit: 1600,
			status: 'ACTIVE',
			terms: null
		},
		unit: {
			id: 'unit-2',
			unitNumber: '102',
			bedrooms: 2,
			bathrooms: 1,
			squareFootage: 900
		},
		property: {
			id: 'property-1',
			name: 'Sunset Apartments',
			address: '123 Main St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94105'
		},
		monthlyRent: 1600,
		leaseStatus: 'ACTIVE',
		paymentStatus: null,
		unitDisplay: 'Unit 102',
		propertyDisplay: 'Sunset Apartments',
		leaseStart: '2024-01-01',
		leaseEnd: '2024-12-31'
	}
]

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
	)
}

describe('TenantsTableClient', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Rendering', () => {
		test('renders tenant list with correct data', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			expect(screen.getByText('John Doe')).toBeInTheDocument()
			expect(screen.getByText('john@example.com')).toBeInTheDocument()
			expect(screen.getByText('Jane Smith')).toBeInTheDocument()
			expect(screen.getByText('jane@example.com')).toBeInTheDocument()
		})

		test('shows empty state when no tenants', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={[]} />
			)

			// DataTable shows "No results" when empty
			expect(screen.getByText(/no results/i)).toBeInTheDocument()
		})

		test('renders action buttons for each tenant', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			// Should have View, Edit, Delete for each tenant
			const viewButtons = screen.getAllByRole('link', { name: /view/i })
			const editButtons = screen.getAllByRole('link', { name: /edit/i })
			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

			expect(viewButtons).toHaveLength(2)
			expect(editButtons).toHaveLength(2)
			expect(deleteButtons).toHaveLength(2)
		})

		test('view button links to tenant detail page', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const viewButtons = screen.getAllByRole('link', { name: /view/i })

			expect(viewButtons[0]).toHaveAttribute('href', '/manage/tenants/tenant-1')
			expect(viewButtons[1]).toHaveAttribute('href', '/manage/tenants/tenant-2')
		})

		test('edit button links to tenant edit page', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const editButtons = screen.getAllByRole('link', { name: /edit/i })

			expect(editButtons[0]).toHaveAttribute('href', '/manage/tenants/tenant-1/edit')
			expect(editButtons[1]).toHaveAttribute('href', '/manage/tenants/tenant-2/edit')
		})
	})

	describe('Delete Functionality', () => {
		test('opens confirmation dialog when delete button clicked', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
			await user.click(deleteButtons[0]!)

			// Dialog should open
			await waitFor(() => {
				expect(screen.getByText(/delete tenant/i)).toBeInTheDocument()
				expect(screen.getByText(/permanently delete/i)).toBeInTheDocument()
				// Look for John Doe in the dialog content (appears in both table and dialog)
				expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
			})
		})

		test('shows cancel button in delete dialog', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
			await user.click(deleteButtons[0]!)

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
			})
		})

		test('closes dialog when cancel clicked', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
			await user.click(deleteButtons[0]!)

			await waitFor(() => {
				expect(screen.getByText(/delete tenant/i)).toBeInTheDocument()
			})

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton!)

			// Dialog should close
			await waitFor(() => {
				expect(screen.queryByText(/delete tenant/i)).not.toBeInTheDocument()
			})
		})
	})

	describe('Table Features', () => {
		test('displays all column headers', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			expect(screen.getByText('Name')).toBeInTheDocument()
			expect(screen.getByText('Email')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
		})

		test('renders multiple rows correctly', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			// Should show both tenants
			expect(screen.getByText('John Doe')).toBeInTheDocument()
			expect(screen.getByText('Jane Smith')).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		test('delete buttons have accessible labels', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

			// Should have screen reader text
			deleteButtons.forEach(button => {
				expect(button).toHaveAccessibleName()
			})
		})

		test('action buttons are keyboard accessible', () => {
			renderWithQueryClient(
				<TenantsTableClient columns={MOCK_COLUMNS} initialTenants={MOCK_TENANTS} />
			)

			const viewButtons = screen.getAllByRole('link', { name: /view/i })
			const editButtons = screen.getAllByRole('link', { name: /edit/i })
			const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

			// All buttons should be in tab order
			;[...viewButtons, ...editButtons, ...deleteButtons].forEach(button => {
				expect(button).not.toHaveAttribute('tabindex', '-1')
			})
		})
	})

	describe('Edge Cases', () => {
		test('handles single tenant', () => {
			renderWithQueryClient(
				<TenantsTableClient
					columns={MOCK_COLUMNS}
					initialTenants={[MOCK_TENANTS[0]!]}
				/>
			)

			expect(screen.getByText('John Doe')).toBeInTheDocument()
			expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
		})

		test('handles tenant with missing lease info', () => {
			const tenantWithoutLease: TenantWithLeaseInfo = {
				id: 'tenant-1',
				name: 'John Doe',
				email: 'john@example.com',
				phone: '555-0001',
				avatarUrl: null,
				emergencyContact: null,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				invitation_status: 'ACCEPTED',
				invitation_sent_at: '2024-01-01',
				invitation_accepted_at: '2024-01-01',
				invitation_expires_at: null,
				currentLease: null,
				unit: null,
				property: null,
				monthlyRent: 0,
				leaseStatus: 'NONE',
				paymentStatus: null,
				unitDisplay: 'No Unit',
				propertyDisplay: 'No Property',
				leaseStart: null,
				leaseEnd: null
			}

			renderWithQueryClient(
				<TenantsTableClient
					columns={MOCK_COLUMNS}
					initialTenants={[tenantWithoutLease]}
				/>
			)

			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})

		test('renders correctly with custom columns', () => {
			const customColumns: ColumnDef<TenantWithLeaseInfo>[] = [
				{
					accessorKey: 'name',
					header: 'Tenant Name'
				}
			]

			renderWithQueryClient(
				<TenantsTableClient columns={customColumns} initialTenants={MOCK_TENANTS} />
			)

			expect(screen.getByText('Tenant Name')).toBeInTheDocument()
			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})
	})
})
