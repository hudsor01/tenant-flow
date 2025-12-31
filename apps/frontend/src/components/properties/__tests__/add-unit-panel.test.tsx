import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddUnitPanel } from '../add-unit-panel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the mutation hook
const mockMutateAsync = vi.fn()
vi.mock('#hooks/api/mutations/unit-mutations', () => ({
	useCreateUnitMutation: () => ({
		mutateAsync: mockMutateAsync,
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

describe('AddUnitPanel', () => {
	const defaultProps = {
		propertyId: 'prop-1',
		propertyName: 'Test Property',
		open: true,
		onOpenChange: vi.fn(),
		onSuccess: vi.fn()
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockMutateAsync.mockResolvedValue({
			id: 'new-unit-id',
			unit_number: '101'
		})
	})

	describe('Basic Rendering', () => {
		it('should render panel title', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })
			expect(screen.getByText('Add Unit')).toBeInTheDocument()
		})

		it('should render panel description with property name', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })
			expect(
				screen.getByText(/add a new unit to test property/i)
			).toBeInTheDocument()
		})

		it('should render all form fields', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			expect(screen.getByLabelText(/unit number/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/bedrooms/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/bathrooms/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/square feet/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument()
			// Status select uses Radix Select which doesn't have proper label association
			expect(screen.getByText(/initial status/i)).toBeInTheDocument()
		})
	})

	describe('Form Validation', () => {
		it('should require unit number', async () => {
			const { toast } = await import('sonner')
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			// Fill in rent but not unit number
			fireEvent.change(screen.getByLabelText(/monthly rent/i), {
				target: { value: '1500' }
			})

			fireEvent.click(screen.getByRole('button', { name: /create unit/i }))

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith('Unit number is required')
			})
		})

		it('should require rent amount', async () => {
			const { toast } = await import('sonner')
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			// Fill in unit number but not rent
			fireEvent.change(screen.getByLabelText(/unit number/i), {
				target: { value: '101' }
			})

			fireEvent.click(screen.getByRole('button', { name: /create unit/i }))

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith('Monthly rent is required')
			})
		})
	})

	describe('Form Submission', () => {
		it('should call mutation with correct data', async () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			fireEvent.change(screen.getByLabelText(/unit number/i), {
				target: { value: '101' }
			})
			fireEvent.change(screen.getByLabelText(/bedrooms/i), {
				target: { value: '2' }
			})
			fireEvent.change(screen.getByLabelText(/bathrooms/i), {
				target: { value: '1.5' }
			})
			fireEvent.change(screen.getByLabelText(/square feet/i), {
				target: { value: '850' }
			})
			fireEvent.change(screen.getByLabelText(/monthly rent/i), {
				target: { value: '1500' }
			})

			fireEvent.click(screen.getByRole('button', { name: /create unit/i }))

			await waitFor(() => {
				expect(mockMutateAsync).toHaveBeenCalledWith(
					expect.objectContaining({
						property_id: 'prop-1',
						unit_number: '101',
						bedrooms: 2,
						bathrooms: 1.5,
						square_feet: 850,
						rent_amount: 1500,
						status: 'available'
					})
				)
			})
		})

		it('should close panel on successful submission', async () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			fireEvent.change(screen.getByLabelText(/unit number/i), {
				target: { value: '101' }
			})
			fireEvent.change(screen.getByLabelText(/monthly rent/i), {
				target: { value: '1500' }
			})

			fireEvent.click(screen.getByRole('button', { name: /create unit/i }))

			await waitFor(() => {
				expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
			})
		})

		it('should call onSuccess callback after successful submission', async () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			fireEvent.change(screen.getByLabelText(/unit number/i), {
				target: { value: '101' }
			})
			fireEvent.change(screen.getByLabelText(/monthly rent/i), {
				target: { value: '1500' }
			})

			fireEvent.click(screen.getByRole('button', { name: /create unit/i }))

			await waitFor(() => {
				expect(defaultProps.onSuccess).toHaveBeenCalled()
			})
		})
	})

	describe('Cancel Button', () => {
		it('should close panel when cancel is clicked', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

			expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
		})
	})

	describe('Status Selection', () => {
		it('should default to available status', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			// The status select trigger should show the default value
			// Multiple elements may have "Vacant" (trigger + hidden option)
			const vacantElements = screen.getAllByText('Vacant')
			expect(vacantElements.length).toBeGreaterThan(0)
		})

		it('should show note about available statuses', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			expect(
				screen.getByText(/only available or maintenance can be set/i)
			).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('should have accessible form labels', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			// All inputs should be associated with labels
			expect(screen.getByLabelText(/unit number/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/bedrooms/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/bathrooms/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/square feet/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument()
		})

		it('should have submit button with clear label', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			expect(
				screen.getByRole('button', { name: /create unit/i })
			).toBeInTheDocument()
		})
	})

	describe('Default Values', () => {
		it('should default bedrooms to 1', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			const bedroomsInput = screen.getByLabelText(/bedrooms/i)
			expect(bedroomsInput).toHaveValue(1)
		})

		it('should default bathrooms to 1', () => {
			render(<AddUnitPanel {...defaultProps} />, { wrapper: createWrapper() })

			const bathroomsInput = screen.getByLabelText(/bathrooms/i)
			expect(bathroomsInput).toHaveValue(1)
		})
	})
})
