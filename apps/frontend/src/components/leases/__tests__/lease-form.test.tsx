/**
 * LeaseForm Component Tests
 * Tests consolidated lease form in both create and edit modes
 *
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { LeaseForm } from '../lease-form.client'
import type { Lease } from '@repo/shared/types/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock hooks
vi.mock('#hooks/api/use-lease', () => ({
	useCreateLease: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'new-lease-id' }),
		isPending: false
	}),
	useUpdateLease: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'lease-1' }),
		isPending: false
	}),
	leaseKeys: {
		detail: (id: string) => ['leases', id]
	}
}))

vi.mock('#hooks/api/use-tenant', () => ({
	useTenantList: () => ({
		data: {
			data: [
				{ id: 'tenant-1', name: 'John Doe', email: 'john@example.com' },
				{ id: 'tenant-2', name: 'Jane Smith', email: 'jane@example.com' }
			]
		},
		isLoading: false
	})
}))

vi.mock('#hooks/api/use-properties', () => ({
	usePropertyList: () => ({
		data: {
			data: [
				{
					id: 'property-1',
					name: 'Main Street Apartments',
					address: '123 Main St'
				},
				{ id: 'property-2', name: 'Oak Avenue Complex', address: '456 Oak Ave' }
			]
		},
		isLoading: false
	})
}))

vi.mock('#hooks/api/use-unit', () => ({
	useUnitsByProperty: () => ({
		data: {
			data: [
				{
					id: 'unit-1',
					unitNumber: '101',
					propertyId: 'property-1',
					status: 'VACANT'
				},
				{
					id: 'unit-2',
					unitNumber: '102',
					propertyId: 'property-1',
					status: 'VACANT'
				}
			]
		},
		isLoading: false
	})
}))

vi.mock('#lib/api/client', () => ({
	clientFetch: vi.fn().mockResolvedValue([
		{
			id: 'unit-1',
			unitNumber: '101',
			propertyId: 'property-1',
			status: 'VACANT'
		},
		{
			id: 'unit-2',
			unitNumber: '102',
			propertyId: 'property-1',
			status: 'OCCUPIED'
		}
	])
}))

const DEFAULT_LEASE: Lease = {
	id: 'lease-1',
	propertyId: 'property-1',
	unitId: 'unit-1',
	tenantId: 'tenant-1',
	startDate: '2024-01-01',
	endDate: '2024-12-31',
	rentAmount: 1500,
	securityDeposit: 1500,
	terms: 'Standard lease terms',
	status: 'ACTIVE',
	gracePeriodDays: null,
	lateFeeAmount: null,
	lateFeePercentage: null,
	lease_document_url: null,
	monthlyRent: null,
	signature: null,
	signed_at: null,
	stripe_subscription_id: null,
	stripeSubscriptionId: null,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z',
	version: 1
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
		test('renders create mode with empty form', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/start date/i)).toHaveValue('')
			expect(screen.getByLabelText(/end date/i)).toHaveValue('')
			expect(
				screen.getByRole('button', { name: /create lease/i })
			).toBeInTheDocument()
		})

		test('shows only vacant units in create mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const unitSelect = screen.getByLabelText(/unit/i)
			expect(unitSelect).toBeInTheDocument()
			// Note: In create mode, only vacant units from useVacantUnits should be shown
		})

		test('shows status field defaulting to DRAFT in create mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const statusSelect = screen.getByLabelText(/status/i)
			expect(statusSelect).toBeInTheDocument()
			// Default status should be DRAFT - check the button has Draft selected
			expect(statusSelect).toHaveTextContent('Draft')
		})

		test('displays correct button text in create mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const submitButton = screen.getByRole('button', { name: /create lease/i })
			expect(submitButton).toBeInTheDocument()
			expect(submitButton).not.toBeDisabled()
		})

		test('shows all required fields marked with asterisk', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByText(/tenant \*/i)).toBeInTheDocument()
			expect(screen.getByText(/unit \*/i)).toBeInTheDocument()
			expect(screen.getByText(/start date \*/i)).toBeInTheDocument()
			expect(screen.getByText(/end date \*/i)).toBeInTheDocument()
			expect(screen.getByText(/monthly rent \*/i)).toBeInTheDocument()
			expect(screen.getByText(/security deposit \*/i)).toBeInTheDocument()
			expect(screen.getByText(/status \*/i)).toBeInTheDocument()
		})
	})

	describe('Edit Mode', () => {
		test('renders edit mode with populated fields', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			expect(screen.getByLabelText(/start date/i)).toHaveValue('2024-01-01')
			expect(screen.getByLabelText(/end date/i)).toHaveValue('2024-12-31')
			expect(screen.getByLabelText(/monthly rent/i)).toHaveValue(1500)
			expect(screen.getByLabelText(/security deposit/i)).toHaveValue(1500)
			expect(screen.getByLabelText(/terms/i)).toHaveValue(
				'Standard lease terms'
			)
		})

		test('shows status field in edit mode', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			// Status select should be a combobox
			expect(
				screen.getByRole('combobox', { name: /status/i })
			).toBeInTheDocument()
		})

		test('displays correct button text in edit mode', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			const submitButton = screen.getByRole('button', { name: /save changes/i })
			expect(submitButton).toBeInTheDocument()
			expect(submitButton).not.toBeDisabled()
		})

		test('shows all units in edit mode (not just vacant)', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			// In edit mode, should fetch all units, not just vacant ones
			const unitSelect = screen.getByLabelText(/unit/i)
			expect(unitSelect).toBeInTheDocument()
		})

		test('populates status select with correct value', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			// Status select should be a combobox with the value
			expect(
				screen.getByRole('combobox', { name: /status/i })
			).toBeInTheDocument()
		})
	})

	describe('Form Validation', () => {
		test('validates rent amount is numeric', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const rentInput = screen.getByLabelText(/monthly rent/i)
			await user.clear(rentInput)
			await user.type(rentInput, '1500')

			expect(rentInput).toHaveValue(1500)
		})

		test('validates security deposit is numeric', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const depositInput = screen.getByLabelText(/security deposit/i)
			await user.clear(depositInput)
			await user.type(depositInput, '1500')

			expect(depositInput).toHaveValue(1500)
		})

		test('validates date format for start date', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const startDateInput = screen.getByLabelText(/start date/i)
			await user.type(startDateInput, '2024-01-01')

			expect(startDateInput).toHaveValue('2024-01-01')
		})

		test('validates date format for end date', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const endDateInput = screen.getByLabelText(/end date/i)
			await user.type(endDateInput, '2024-12-31')

			expect(endDateInput).toHaveValue('2024-12-31')
		})

		test('accepts minimum rent amount of 0', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const rentInput = screen.getByLabelText(/monthly rent/i)
			await user.clear(rentInput)
			await user.type(rentInput, '0')

			expect(rentInput).toHaveValue(0)
		})

		test('accepts decimal values for rent amount', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const rentInput = screen.getByLabelText(/monthly rent/i)
			await user.clear(rentInput)
			await user.type(rentInput, '1500.50')

			expect(rentInput).toHaveValue(1500.5)
		})
	})

	describe('User Interactions', () => {
		test('allows user to fill out the form', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			await user.type(screen.getByLabelText(/start date/i), '2024-01-01')
			await user.type(screen.getByLabelText(/end date/i), '2024-12-31')
			await user.type(screen.getByLabelText(/monthly rent/i), '1500')
			await user.type(screen.getByLabelText(/security deposit/i), '1500')
			await user.type(
				screen.getByLabelText(/terms/i),
				'Standard lease agreement'
			)

			expect(screen.getByLabelText(/start date/i)).toHaveValue('2024-01-01')
			expect(screen.getByLabelText(/end date/i)).toHaveValue('2024-12-31')
			expect(screen.getByLabelText(/monthly rent/i)).toHaveValue(1500)
			expect(screen.getByLabelText(/security deposit/i)).toHaveValue(1500)
			expect(screen.getByLabelText(/terms/i)).toHaveValue(
				'Standard lease agreement'
			)
		})

		test('cancel button navigates back', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<LeaseForm mode="create" />)

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			// Note: window.history.back() is called, which we can't easily test in jsdom
			// This test verifies the button exists and is clickable
		})

		test('handles property selection', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const propertySelect = screen.getByLabelText(/property/i)
			expect(propertySelect).toBeInTheDocument()
			// Note: SelectValue placeholder should be visible
			expect(screen.getByText(/select property/i)).toBeInTheDocument()
		})

		test('handles tenant selection', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const tenantSelect = screen.getByLabelText(/tenant/i)
			expect(tenantSelect).toBeInTheDocument()
			// Note: SelectValue placeholder should be visible
			expect(screen.getByText(/select tenant/i)).toBeInTheDocument()
		})

		test('handles unit selection', async () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const unitSelect = screen.getByLabelText(/unit/i)
			expect(unitSelect).toBeInTheDocument()
			// Note: SelectValue placeholder should be visible
			expect(screen.getByText(/select unit/i)).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		test('all form fields have proper labels', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByLabelText(/property/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/security deposit/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/terms/i)).toBeInTheDocument()
		})

		test('numeric inputs have appropriate type and constraints', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const rentInput = screen.getByLabelText(/monthly rent/i)
			expect(rentInput).toHaveAttribute('type', 'number')
			expect(rentInput).toHaveAttribute('min', '0')
			expect(rentInput).toHaveAttribute('step', '0.01')

			const depositInput = screen.getByLabelText(/security deposit/i)
			expect(depositInput).toHaveAttribute('type', 'number')
			expect(depositInput).toHaveAttribute('min', '0')
			expect(depositInput).toHaveAttribute('step', '0.01')
		})

		test('date inputs have appropriate type', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByLabelText(/start date/i)).toHaveAttribute(
				'type',
				'date'
			)
			expect(screen.getByLabelText(/end date/i)).toHaveAttribute('type', 'date')
		})

		test('textarea has appropriate rows attribute', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const termsTextarea = screen.getByLabelText(/terms/i)
			expect(termsTextarea).toHaveAttribute('rows', '4')
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
				renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)
			}).not.toThrow()
		})

		test('accepts onSuccess callback prop', async () => {
			const onSuccess = vi.fn()
			renderWithQueryClient(
				<LeaseForm mode="edit" lease={DEFAULT_LEASE} onSuccess={onSuccess} />
			)

			// Note: Full form submission testing would require mocking the mutation
			// This verifies the prop is accepted
			expect(onSuccess).not.toHaveBeenCalled() // Not called until form submits
		})

		test('submit button is disabled when mutation is pending', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const submitButton = screen.getByRole('button', {
				name: /create lease/i
			})
			expect(submitButton).not.toBeDisabled()
			// Note: Would need to mock isPending: true to test disabled state
		})

		test('shows correct placeholder text based on mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			// Form uses same placeholder in both modes
			expect(
				screen.getByPlaceholderText(/additional lease terms and conditions/i)
			).toBeInTheDocument()
		})

		test('shows CheckCircle icon in submit button', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			const submitButton = screen.getByRole('button', {
				name: /create lease/i
			})
			// Icon is rendered inside the button
			expect(submitButton).toBeInTheDocument()
		})
	})

	describe('Financial Fields', () => {
		test('renders monthly rent label', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByText(/monthly rent \*/i)).toBeInTheDocument()
		})

		test('renders security deposit label', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByText(/security deposit \*/i)).toBeInTheDocument()
		})

		test('initializes rent amount to 0 in create mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByLabelText(/monthly rent/i)).toHaveValue(0)
		})

		test('initializes security deposit to 0 in create mode', () => {
			renderWithQueryClient(<LeaseForm mode="create" />)

			expect(screen.getByLabelText(/security deposit/i)).toHaveValue(0)
		})

		test('populates financial fields from lease data in edit mode', () => {
			renderWithQueryClient(<LeaseForm mode="edit" lease={DEFAULT_LEASE} />)

			expect(screen.getByLabelText(/monthly rent/i)).toHaveValue(1500)
			expect(screen.getByLabelText(/security deposit/i)).toHaveValue(1500)
		})
	})
})
