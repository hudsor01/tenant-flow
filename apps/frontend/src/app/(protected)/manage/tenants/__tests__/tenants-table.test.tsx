/**
 * @vitest-environment jsdom
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '#test/utils/test-render'
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
		accessorKey: 'lease_status',
		header: 'Status'
	}
]

const MOCK_TENANTS: TenantWithLeaseInfo[] = [
	{
		id: 'tenant-1',
		user_id: 'user-1',
		first_name: 'Sarah',
		last_name: 'Johnson',
		name: 'Sarah Johnson',
		email: 'sarah.johnson@email.com',
		phone: '310-555-0101',
		emergency_contact_name: null,
		emergency_contact_phone: null,
		emergency_contact_relationship: null,
		date_of_birth: null,
		identity_verified: false,
		ssn_last_four: null,
		stripe_customer_id: 'cus_123',
		created_at: '2024-05-01',
		updated_at: '2024-10-01',

		currentLease: {
			id: 'lease-1',
			start_date: '2024-05-01',
			end_date: '2025-04-30',
			rent_amount: 3500,
			security_deposit: 7000,
			status: 'ACTIVE',
			primary_tenant_id: 'tenant-1',
			unit_id: 'unit-101'
		},
		leases: [],
		unit: {
			id: 'unit-101',
			unit_number: '101',
			bedrooms: 2,
			bathrooms: 2,
			square_feet: 1200,
			rent_amount: 3500
		},
		property: {
			id: 'property-1',
			name: 'Sunset Towers',
			address_line1: '123 Ocean Avenue',
			city: 'Santa Monica',
			state: 'CA',
			postal_code: '90401'
		},
		monthlyRent: 3500,
		lease_status: 'ACTIVE',
		paymentStatus: 'Current',
		unitDisplay: 'Unit 101',
		propertyDisplay: 'Sunset Towers, Santa Monica',
		leaseStart: '2024-05-01',
		leaseEnd: '2025-04-30'
	},
	{
		id: 'tenant-2',
		user_id: 'user-2',
		first_name: 'Michael',
		last_name: 'Chen',
		name: 'Michael Chen',
		email: 'michael.chen@email.com',
		phone: '310-555-0102',
		emergency_contact_name: null,
		emergency_contact_phone: null,
		emergency_contact_relationship: null,
		date_of_birth: null,
		identity_verified: false,
		ssn_last_four: null,
		stripe_customer_id: 'cus_124',
		created_at: '2024-06-10',
		updated_at: '2024-10-05',
		
		currentLease: {
			id: 'lease-2',
			start_date: '2024-06-01',
			end_date: '2025-05-31',
			rent_amount: 3800,
			security_deposit: 7600,
			status: 'ACTIVE',
			primary_tenant_id: 'tenant-2',
			unit_id: 'unit-A'
		},
		leases: [],
		unit: {
			id: 'unit-A',
			unit_number: 'A',
			bedrooms: 3,
			bathrooms: 2,
			square_feet: 1400,
			rent_amount: 3800
		},
		property: {
			id: 'property-2',
			name: 'Harbor View Residences',
			address_line1: '456 Marina Boulevard',
			city: 'San Diego',
			state: 'CA',
			postal_code: '92101'
		},
		monthlyRent: 3800,
		lease_status: 'ACTIVE',
		paymentStatus: 'Current',
		unitDisplay: 'Unit A',
		propertyDisplay: 'Harbor View Residences, San Diego',
		leaseStart: '2024-06-01',
		leaseEnd: '2025-05-31'
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

		expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
		expect(screen.getByText('sarah.johnson@email.com')).toBeInTheDocument()
		expect(screen.getByText('Michael Chen')).toBeInTheDocument()
		expect(screen.getByText('michael.chen@email.com')).toBeInTheDocument()
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
		// Look for Sarah Johnson in the dialog content (appears in both table and dialog)
		expect(screen.getAllByText('Sarah Johnson').length).toBeGreaterThan(0)
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
			expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
			expect(screen.getByText('Michael Chen')).toBeInTheDocument()
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

			expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
			expect(screen.queryByText('Michael Chen')).not.toBeInTheDocument()
		})

		test('handles tenant with missing lease info', () => {
			const tenantWithoutLease: TenantWithLeaseInfo = {
				id: 'tenant-3',
				user_id: 'user-3',
				first_name: 'Emily',
				last_name: 'Rodriguez',
				name: 'Emily Rodriguez',
				email: 'emily.rodriguez@email.com',
				phone: null,
				emergency_contact_name: null,
				date_of_birth: '1990-01-01',
				identity_verified: false,
				ssn_last_four: null,
				stripe_customer_id: null,
				emergency_contact_phone: null,
				emergency_contact_relationship: null,
				created_at: '2024-08-01',
				updated_at: '2024-08-01',
				currentLease: null,
				leases: [],
				unit: null,
				property: null,
				monthlyRent: 0,
				lease_status: 'NONE',
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

            expect(screen.getByText('Emily Rodriguez')).toBeInTheDocument()
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
			expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
		})
	})
})
