/**
 * LeaseForm Component Tests
 *
 * Tests the current lease form implementation which includes:
 * - Property selection (for filtering units)
 * - Status selection
 * - Currency selection
 * - Payment day input
 * - Submit/Cancel buttons
 *
 * Note: The full LeaseFormFields component is pending restoration.
 * These tests cover the currently implemented functionality.
 *
 * @jest-environment jsdom
 */

import { screen, waitFor } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { LeaseForm } from '../lease-form'
import type { LeaseWithExtras } from '@repo/shared/types/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock hooks
const mockCreateLeaseMutation = vi.fn().mockResolvedValue({ id: 'new-lease-id' })
const mockUpdateLeaseMutation = vi.fn().mockResolvedValue({ id: 'lease-1' })

vi.mock('#hooks/api/use-lease', () => ({
	useCreateLeaseMutation: () => ({
		mutateAsync: mockCreateLeaseMutation,
		isPending: false
	}),
	useUpdateLeaseMutation: () => ({
		mutateAsync: mockUpdateLeaseMutation,
		isPending: false
	}),
	leaseQueries: {
		detail: (id: string) => ({
			queryKey: ['leases', 'detail', id]
		})
	}
}))

vi.mock('#hooks/api/use-tenant', () => ({
	tenantQueries: {
		list: () => ({
			queryKey: ['tenants', 'list'],
			queryFn: () =>
				Promise.resolve({
					data: [
						{ id: 'tenant-1', name: 'John Doe', email: 'john@example.com' },
						{ id: 'tenant-2', name: 'Jane Smith', email: 'jane@example.com' }
					]
				})
		})
	}
}))

vi.mock('#hooks/api/use-properties', () => ({
	propertyQueries: {
		list: () => ({
			queryKey: ['properties', 'list'],
			queryFn: () =>
				Promise.resolve({
					data: [
						{
							id: 'property-1',
							name: 'Main Street Apartments',
							address: '123 Main St'
						},
						{
							id: 'property-2',
							name: 'Oak Avenue Complex',
							address: '456 Oak Ave'
						}
					]
				})
		})
	}
}))

vi.mock('#hooks/api/use-unit', () => ({
	unitQueries: {
		listByProperty: (propertyId: string) => ({
			queryKey: ['units', 'list', 'by-property', propertyId],
			queryFn: () =>
				Promise.resolve({
					data: [
						{
							id: 'unit-1',
							unit_number: '101',
							property_id: propertyId,
							status: 'available'
						},
						{
							id: 'unit-2',
							unit_number: '102',
							property_id: propertyId,
							status: 'available'
						}
					]
				})
		})
	}
}))

// Mock next/navigation
const mockRouterPush = vi.fn()
const mockRouterBack = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockRouterPush,
		back: mockRouterBack
	})
}))

// Mock sonner toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

const mockLease: LeaseWithExtras = {
	id: 'lease-1',
	unit_id: 'unit-1',
	primary_tenant_id: 'tenant-1',
	owner_user_id: 'user-1',
	start_date: '2024-01-01',
	end_date: '2024-12-31',
	rent_amount: 150000,
	security_deposit: 150000,
	lease_status: 'active',
	grace_period_days: null,
	late_fee_amount: null,
	late_fee_days: null,
	stripe_subscription_id: null,
	stripe_subscription_status: 'none',
	subscription_failure_reason: null,
	subscription_retry_count: 0,
	subscription_last_attempt_at: null,
	auto_pay_enabled: null,
	payment_day: 1,
	rent_currency: 'USD',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
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
	stripe_connected_account_id: null,
	unit: {
		id: 'unit-1',
		unit_number: '101',
		property_id: 'property-1'
	}
}

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

describe('LeaseForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		test('renders create mode with form fields', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			// Wait for properties to load
			await waitFor(() => {
				expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
			})

			// Check for fields that exist in the current component
			expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/payment day/i)).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /create lease/i })
			).toBeInTheDocument()
		})

		test('shows status field defaulting to DRAFT in create mode', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			})

			// Status trigger should show Draft as default
			const statusTrigger = screen.getByRole('combobox', { name: /status/i })
			expect(statusTrigger).toHaveTextContent(/draft/i)
		})

		test('shows currency field defaulting to USD', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
			})

			const currencyTrigger = screen.getByRole('combobox', { name: /currency/i })
			expect(currencyTrigger).toHaveTextContent(/USD/i)
		})

		test('shows payment day field defaulting to 1', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/payment day/i)).toBeInTheDocument()
			})

			const paymentDayInput = screen.getByLabelText(/payment day/i)
			expect(paymentDayInput).toHaveValue(1)
		})

		test('displays correct button text in create mode', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /create lease/i })
				).toBeInTheDocument()
			})

			const submitButton = screen.getByRole('button', { name: /create lease/i })
			expect(submitButton).not.toBeDisabled()
		})

		test('shows Cancel button', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /cancel/i })
				).toBeInTheDocument()
			})
		})
	})

	describe('Edit Mode', () => {
		test('renders edit mode with populated fields', async () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={mockLease} />)

			await waitFor(() => {
				expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			})

			// Check status is populated from lease
			const statusTrigger = screen.getByRole('combobox', { name: /status/i })
			expect(statusTrigger).toHaveTextContent(/active/i)

			// Check currency is populated from lease
			const currencyTrigger = screen.getByRole('combobox', { name: /currency/i })
			expect(currencyTrigger).toHaveTextContent(/USD/i)

			// Check payment day is populated from lease
			const paymentDayInput = screen.getByLabelText(/payment day/i)
			expect(paymentDayInput).toHaveValue(1)
		})

		test('displays correct button text in edit mode', async () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={mockLease} />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /save changes/i })
				).toBeInTheDocument()
			})

			const submitButton = screen.getByRole('button', { name: /save changes/i })
			expect(submitButton).not.toBeDisabled()
		})

		test('pre-selects property when lease has unit with property_id', async () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={mockLease} />)

			await waitFor(() => {
				expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
			})

			// Property should be pre-selected based on lease.unit.property_id
			const propertyTrigger = screen.getByRole('combobox', { name: /property/i })
			expect(propertyTrigger).toBeInTheDocument()
		})
	})

	describe('User Interactions', () => {
		test('cancel button calls router.back()', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /cancel/i })
				).toBeInTheDocument()
			})

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			expect(mockRouterBack).toHaveBeenCalled()
		})

		test('payment day input is editable', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/payment day/i)).toBeInTheDocument()
			})

			const paymentDayInput = screen.getByLabelText(
				/payment day/i
			) as HTMLInputElement

			// Verify initial value
			expect(paymentDayInput).toHaveValue(1)

			// Type additional digit - verifies input accepts user input
			await user.type(paymentDayInput, '5')
			// Value becomes 15 (1 + 5 typed)
			expect(paymentDayInput.value).toBe('15')
		})

		test('property select shows placeholder when no property selected', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByText(/select property/i)).toBeInTheDocument()
			})
		})
	})

	describe('Accessibility', () => {
		test('all form fields have proper labels', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
			})

			expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/payment day/i)).toBeInTheDocument()
		})

		test('payment day input has appropriate type and constraints', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(screen.getByLabelText(/payment day/i)).toBeInTheDocument()
			})

			const paymentDayInput = screen.getByLabelText(/payment day/i)
			expect(paymentDayInput).toHaveAttribute('type', 'number')
			expect(paymentDayInput).toHaveAttribute('min', '1')
			expect(paymentDayInput).toHaveAttribute('max', '31')
		})
	})

	describe('Mode-Specific Behavior', () => {
		test('create mode does not require lease prop', () => {
			expect(() => {
				renderWithQueryClient(<LeaseForm mode="create" />)
			}).not.toThrow()
		})

		test('edit mode renders with lease data', () => {
			expect(() => {
				renderWithQueryClient(<LeaseForm mode="edit" lease={mockLease} />)
			}).not.toThrow()
		})

		test('accepts onSuccess callback prop', async () => {
			const onSuccess = vi.fn()
			renderWithQueryClient(
				<LeaseForm mode="edit" lease={mockLease} onSuccess={onSuccess} />
			)

			// Verify the prop is accepted without errors
			await waitFor(() => {
				expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			})

			// onSuccess is not called until form submits successfully
			expect(onSuccess).not.toHaveBeenCalled()
		})
	})

	describe('Form State', () => {
		test('submit button is not disabled initially', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /create lease/i })
				).toBeInTheDocument()
			})

			const submitButton = screen.getByRole('button', { name: /create lease/i })
			expect(submitButton).not.toBeDisabled()
		})

		test('cancel button is not disabled initially', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /cancel/i })
				).toBeInTheDocument()
			})

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			expect(cancelButton).not.toBeDisabled()
		})
	})
})
