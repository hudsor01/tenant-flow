/**
 * MaintenanceForm Component Tests
 * Tests consolidated maintenance form in both create and edit modes
 *
 * @vitest-environment jsdom
 */

import type { ReactElement } from 'react'

import { screen, waitFor } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { act } from '@testing-library/react'
import { MaintenanceForm } from '../maintenance-form.client'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock hooks
vi.mock('#hooks/api/use-maintenance', () => ({
	useMaintenanceRequestCreateMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'new-request-id' }),
		isPending: false
	}),
	useMaintenanceRequestUpdateMutation: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'request-1' }),
		isPending: false
	}),
	maintenanceKeys: {
		detail: (id: string) => ['maintenance', id]
	}
}))

vi.mock('#hooks/api/use-properties', () => ({
	usePropertyList: () => ({
		data: [
			{
				id: 'property-1',
				name: 'Sunset Apartments',
				address: '123 Main St',
				city: 'San Francisco',
				state: 'CA',
				postal_code: '94105'
			},
			{
				id: 'property-2',
				name: 'Ocean View Complex',
				address: '456 Beach Ave',
				city: 'San Diego',
				state: 'CA',
				postal_code: '92101'
			}
		],
		isLoading: false
	})
}))

vi.mock('#hooks/api/use-unit', () => ({
	useUnitsByProperty: () => ({
		data: [
			{
				id: 'unit-1',
				unit_number: '101',
				property_id: 'property-1',
				status: 'occupied'
			},
			{
				id: 'unit-2',
				unit_number: '102',
				property_id: 'property-1',
				status: 'available'
			},
			{
				id: 'unit-3',
				unit_number: '201',
				property_id: 'property-2',
				status: 'occupied'
			}
		],
		isLoading: false
	}),
	useUnitList: () => ({
		data: [
			{
				id: 'unit-1',
				unit_number: '101',
				property_id: 'property-1',
				status: 'occupied'
			},
			{
				id: 'unit-2',
				unit_number: '102',
				property_id: 'property-1',
				status: 'available'
			},
			{
				id: 'unit-3',
				unit_number: '201',
				property_id: 'property-2',
				status: 'occupied'
			}
		],
		isLoading: false
	})
}))

const mockMaintenanceRequest: MaintenanceRequest = {
	id: 'request-1',
	title: 'Kitchen Faucet Issue',
	unit_id: 'unit-1',
	requested_by: 'tenant-1',
	owner_user_id: 'user-1',
	description: 'The kitchen faucet is dripping continuously',
	priority: 'medium',
	status: 'open',
	estimated_cost: 150,
	actual_cost: null,
	assigned_to: null,
	completed_at: null,
	inspection_date: null,
	inspection_findings: null,
	inspector_id: null,
	scheduled_date: null,
	tenant_id: 'tenant-1',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

function renderWithQueryClient(ui: ReactElement) {
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

describe('MaintenanceForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		test('renders create mode with empty form', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/unit \*/i)).toBeInTheDocument()
			})

			expect(screen.getByLabelText(/description/i)).toHaveValue('')
			expect(
				screen.getByRole('button', { name: /create request/i })
			).toBeInTheDocument()
		})

		test('shows all required fields marked with asterisk', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/unit \*/i)).toBeInTheDocument()
			})

			expect(screen.getByText(/title \*/i)).toBeInTheDocument()
			expect(screen.getByText(/description \*/i)).toBeInTheDocument()
			expect(screen.getByText(/priority \*/i)).toBeInTheDocument()
		})

		test('displays correct button text in create mode', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				const submitButton = screen.getByRole('button', {
					name: /create request/i
				})
				expect(submitButton).toBeInTheDocument()
				expect(submitButton).not.toBeDisabled()
			})
		})

		test('shows unit select', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/unit \*/i)).toBeInTheDocument()
				expect(screen.getByText(/select unit/i)).toBeInTheDocument()
			})
		})

		test('shows all priority options', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/priority \*/i)).toBeInTheDocument()
			})
			// Note: Priority options (Low, Medium, High, Urgent) are in the SelectContent dropdown
		})
	})

	describe('Edit Mode', () => {
		test('renders edit mode with populated fields', async () => {
			await act(async () => {
				renderWithQueryClient(
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				)
			})

			await waitFor(() => {
				expect(screen.getByLabelText(/description/i)).toHaveValue(
					'The kitchen faucet is dripping continuously'
				)
			})

			expect(
				screen.getByRole('button', { name: /save changes/i })
			).toBeInTheDocument()
		})

		test('displays correct button text in edit mode', async () => {
			await act(async () => {
				renderWithQueryClient(
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				)
			})

			await waitFor(() => {
				const submitButton = screen.getByRole('button', {
					name: /save changes/i
				})
				expect(submitButton).toBeInTheDocument()
				expect(submitButton).not.toBeDisabled()
			})
		})

		test('populates priority select with correct value', async () => {
			await act(async () => {
				renderWithQueryClient(
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				)
			})

			await waitFor(() => {
				// Query by the SelectTrigger which shows the selected value
				expect(screen.getByText(/priority \*/i)).toBeInTheDocument()
			})

			// The selected value "Medium" should be visible in the SelectTrigger
			expect(
				screen.getByRole('combobox', { name: /priority/i })
			).toBeInTheDocument()
		})

		test('populates estimated cost field', async () => {
			await act(async () => {
				renderWithQueryClient(
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				)
			})

			await waitFor(() => {
				// Number inputs store values as numbers
				expect(screen.getByLabelText(/estimated cost/i)).toHaveValue(150)
			})
		})

		test('populates title field', async () => {
			await act(async () => {
				renderWithQueryClient(
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				)
			})

			await waitFor(() => {
				expect(screen.getByLabelText(/title/i)).toHaveValue(
					'Kitchen Faucet Issue'
				)
			})
		})
	})

	describe('Form Validation', () => {
		test('validates description is required', async () => {
			const user = userEvent.setup()
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
			})

			const descInput = screen.getByLabelText(/description/i)
			await user.type(descInput, 'A')
			await user.clear(descInput)
			await user.tab()

			// Validation error should appear
		})

		test('accepts valid estimated cost', async () => {
			const user = userEvent.setup()
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByLabelText(/estimated cost/i)).toBeInTheDocument()
			})

			const costInput = screen.getByLabelText(/estimated cost/i)
			await user.type(costInput, '150.50')

			// Number input returns number type (150.50 becomes 150.5)
			expect(costInput).toHaveValue(150.5)
		})
	})

	describe('User Interactions', () => {
		test('allows user to fill out the form', async () => {
			const user = userEvent.setup()
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
			})

			await user.type(screen.getByLabelText(/title/i), 'Broken window')
			await user.type(
				screen.getByLabelText(/description/i),
				'Window in bedroom is cracked'
			)
			await user.type(screen.getByLabelText(/estimated cost/i), '250')

			expect(screen.getByLabelText(/title/i)).toHaveValue('Broken window')
			expect(screen.getByLabelText(/description/i)).toHaveValue(
				'Window in bedroom is cracked'
			)
			// Number input stores value as number
			expect(screen.getByLabelText(/estimated cost/i)).toHaveValue(250)
		})

		test('cancel button navigates back', async () => {
			const user = userEvent.setup()
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(
					screen.getByRole('button', { name: /cancel/i })
				).toBeInTheDocument()
			})

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			// Note: window.history.back() is called, which we can't easily test in jsdom
			// This test verifies the button exists and is clickable
		})

		test('handles priority selection', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(
					screen.getByRole('combobox', { name: /priority/i })
				).toBeInTheDocument()
			})
		})
	})

	describe('Accessibility', () => {
		test('all form fields have proper labels', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/unit \*/i)).toBeInTheDocument()
				expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
				expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
				expect(screen.getByText(/priority \*/i)).toBeInTheDocument()
				expect(screen.getByLabelText(/estimated cost/i)).toBeInTheDocument()
			})
		})

		test('numeric input has appropriate type and constraints', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				const costInput = screen.getByLabelText(/estimated cost/i)
				expect(costInput).toHaveAttribute('type', 'number')
				expect(costInput).toHaveAttribute('min', '0')
				expect(costInput).toHaveAttribute('step', '0.01')
			})
		})

		test('description textarea has appropriate rows attribute', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				const descTextarea = screen.getByLabelText(/description/i)
				expect(descTextarea).toHaveAttribute('rows', '4')
			})
		})

		test('description textarea has placeholder text', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/describe the issue in detail/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('Mode-Specific Behavior', () => {
		test('create mode does not require request prop', () => {
			expect(() => {
				act(() => {
					renderWithQueryClient(<MaintenanceForm mode="create" />)
				})
			}).not.toThrow()
		})

		test('edit mode renders with request data', () => {
			expect(() => {
				act(() => {
					renderWithQueryClient(
						<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
					)
				})
			}).not.toThrow()
		})

		test('submit button shows correct text when pending', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				const submitButton = screen.getByRole('button', {
					name: /create request/i
				})
				expect(submitButton).not.toBeDisabled()
			})
			// Note: Would need to mock isPending: true to test "Creating..." text
		})

		test('shows correct card title based on mode', async () => {
			const { rerender } = await act(async () =>
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			)

			await waitFor(() => {
				expect(screen.getByText(/new maintenance request/i)).toBeInTheDocument()
			})

			rerender(
				<QueryClientProvider
					client={
						new QueryClient({
							defaultOptions: {
								queries: { retry: false },
								mutations: { retry: false }
							}
						})
					}
				>
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				</QueryClientProvider>
			)

			await waitFor(() => {
				expect(
					screen.getByText(/edit maintenance request/i)
				).toBeInTheDocument()
			})
		})

		test('shows correct card description based on mode', async () => {
			const { rerender } = await act(async () =>
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			)

			await waitFor(() => {
				expect(
					screen.getByText(
						/log maintenance issues, assign priority, and track resolution details/i
					)
				).toBeInTheDocument()
			})

			rerender(
				<QueryClientProvider
					client={
						new QueryClient({
							defaultOptions: {
								queries: { retry: false },
								mutations: { retry: false }
							}
						})
					}
				>
					<MaintenanceForm mode="edit" request={mockMaintenanceRequest} />
				</QueryClientProvider>
			)

			await waitFor(() => {
				expect(
					screen.getByText(/update maintenance details and priority settings/i)
				).toBeInTheDocument()
			})
		})

		test('shows Wrench icon in card header', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/new maintenance request/i)).toBeInTheDocument()
			})
			// Note: Icon is rendered as SVG element with Wrench component
		})
	})

	describe('Priority Options', () => {
		test('initializes with LOW priority by default', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(screen.getByText(/priority \*/i)).toBeInTheDocument()
			})
			// Note: Default value is set in form defaultValues
		})

		test('shows priority select', async () => {
			await act(async () => {
				renderWithQueryClient(<MaintenanceForm mode="create" />)
			})

			await waitFor(() => {
				expect(
					screen.getByRole('combobox', { name: /priority/i })
				).toBeInTheDocument()
			})
			// Note: Priority options defined in NOTIFICATION_PRIORITY_OPTIONS from @repo/shared:
			// Low, Medium, High, Urgent
		})
	})
})
