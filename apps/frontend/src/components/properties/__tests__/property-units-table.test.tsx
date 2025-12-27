import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyUnitsTable } from '../property-units-table'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Unit } from '@repo/shared/types/core'

// Mock the hooks
const mockUnits: Unit[] = [
	{
		id: 'unit-1',
		property_id: 'prop-1',
		owner_user_id: 'owner-1',
		unit_number: '101',
		bedrooms: 2,
		bathrooms: 1,
		square_feet: 850,
		rent_amount: 1500,
		rent_currency: 'USD',
		rent_period: 'month',
		status: 'available',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	},
	{
		id: 'unit-2',
		property_id: 'prop-1',
		owner_user_id: 'owner-1',
		unit_number: '102',
		bedrooms: 3,
		bathrooms: 2,
		square_feet: 1200,
		rent_amount: 2000,
		rent_currency: 'USD',
		rent_period: 'month',
		status: 'occupied',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	},
	{
		id: 'unit-3',
		property_id: 'prop-1',
		owner_user_id: 'owner-1',
		unit_number: '103',
		bedrooms: 1,
		bathrooms: 1,
		square_feet: 650,
		rent_amount: 1100,
		rent_currency: 'USD',
		rent_period: 'month',
		status: 'maintenance',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z'
	}
]

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual('@tanstack/react-query')
	return {
		...actual,
		useQuery: () => mockUseQuery(),
		useMutation: () => mockUseMutation()
	}
})

vi.mock('#hooks/api/mutations/unit-mutations', () => ({
	useDeleteUnitMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useCreateUnitMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'new-unit', unit_number: '104' }),
		isPending: false
	})
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

// Wrapper component with QueryClientProvider
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe('PropertyUnitsTable', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseQuery.mockReturnValue({
			data: mockUnits,
			isLoading: false,
			isError: false
		})
	})

	describe('Basic Rendering', () => {
		it('should render units count in header', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText(/Units \(3\)/)).toBeInTheDocument()
		})

		it('should render Add Unit button', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByRole('button', { name: /add unit/i })).toBeInTheDocument()
		})

		it('should render unit numbers in the table', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText('101')).toBeInTheDocument()
			expect(screen.getByText('102')).toBeInTheDocument()
			expect(screen.getByText('103')).toBeInTheDocument()
		})
	})

	describe('Loading State', () => {
		it('should show loading skeleton when data is loading', () => {
			mockUseQuery.mockReturnValue({
				data: undefined,
				isLoading: true,
				isError: false
			})

			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			// Should show skeleton placeholders
			expect(screen.getByText('Units')).toBeInTheDocument()
		})
	})

	describe('Error State', () => {
		it('should show error message when query fails', () => {
			mockUseQuery.mockReturnValue({
				data: undefined,
				isLoading: false,
				isError: true
			})

			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText(/failed to load units/i)).toBeInTheDocument()
		})
	})

	describe('Empty State', () => {
		it('should show empty state message when no units', () => {
			mockUseQuery.mockReturnValue({
				data: [],
				isLoading: false,
				isError: false
			})

			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText(/no units added to this property/i)).toBeInTheDocument()
		})

		it('should show Add Your First Unit button in empty state', () => {
			mockUseQuery.mockReturnValue({
				data: [],
				isLoading: false,
				isError: false
			})

			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByRole('button', { name: /add your first unit/i })).toBeInTheDocument()
		})
	})

	describe('Status Badges', () => {
		it('should display Available badge for available units', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText('Available')).toBeInTheDocument()
		})

		it('should display Occupied badge for occupied units', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText('Occupied')).toBeInTheDocument()
		})

		it('should display Maintenance badge for maintenance units', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			expect(screen.getByText('Maintenance')).toBeInTheDocument()
		})
	})

	describe('Currency Formatting', () => {
		it('should format rent amounts correctly', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)
			// $1,500 for unit 101
			expect(screen.getByText('$1,500')).toBeInTheDocument()
			// $2,000 for unit 102
			expect(screen.getByText('$2,000')).toBeInTheDocument()
			// $1,100 for unit 103
			expect(screen.getByText('$1,100')).toBeInTheDocument()
		})
	})

	describe('Add Unit Panel', () => {
		it('should open add unit panel when Add Unit button is clicked', async () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)

			const addButton = screen.getByRole('button', { name: /add unit/i })
			fireEvent.click(addButton)

			await waitFor(() => {
				expect(screen.getByText(/add a new unit/i)).toBeInTheDocument()
			})
		})
	})

	describe('Table Structure', () => {
		it('should have correct column headers', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)

			expect(screen.getByRole('columnheader', { name: /unit #/i })).toBeInTheDocument()
			// Use exact match for "Rent" to avoid matching "Current Tenant"
			expect(screen.getByRole('columnheader', { name: /^Rent$/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
			expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('should have proper table semantics', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)

			expect(screen.getByRole('table')).toBeInTheDocument()
		})

		it('should have action buttons with aria-labels', () => {
			render(
				<PropertyUnitsTable propertyId="prop-1" propertyName="Test Property" />,
				{ wrapper: createWrapper() }
			)

			// Check for action menu buttons
			const actionButtons = screen.getAllByRole('button', { name: /actions for unit/i })
			expect(actionButtons.length).toBe(3) // One per unit
		})
	})
})
