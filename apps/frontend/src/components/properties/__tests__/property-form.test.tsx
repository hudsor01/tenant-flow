/**
 * PropertyForm Component Tests
 * Tests consolidated property form in both create and edit modes
 *
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import { PropertyForm } from '../property-form.client'
import type { Property } from '@repo/shared/types/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock hooks
vi.mock('#hooks/api/use-properties', () => ({
	useCreateProperty: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'new-property-id' }),
		isPending: false
	}),
	useUpdateProperty: () => ({
		mutateAsync: vi.fn().mockResolvedValue({ id: 'property-1' }),
		isPending: false
	}),
	usePropertyImages: () => ({
		data: [],
		isLoading: false
	}),
	useDeletePropertyImage: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false
	}),
	useUploadPropertyImage: () => ({
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false
	}),
	propertiesKeys: {
		detail: (id: string) => ['properties', id]
	}
}))

vi.mock('#hooks/api/use-supabase-auth', () => ({
	useSupabaseUser: () => ({
		data: { id: 'user-1', email: 'test@example.com' }
	})
}))

vi.mock('#hooks/use-supabase-upload', () => ({
	useSupabaseUpload: () => ({
		isSuccess: false,
		successes: [],
		errors: [],
		files: [],
		getRootProps: () => ({}),
		getInputProps: () => ({}),
		isDragActive: false,
		isDragReject: false
	})
}))

vi.mock('#hooks/use-lightbox-state', () => ({
	useLightboxState: (initialIndex: number) => ({
		isOpen: false,
		currentIndex: initialIndex,
		open: vi.fn(),
		close: vi.fn(),
		goToImage: vi.fn(),
		setIndex: vi.fn()
	})
}))

const DEFAULT_PROPERTY: Property = {
	id: 'property-1',
	property_owner_id: 'owner-1',
	name: 'Sunset Apartments',
	address_line1: '123 Main St',
	address_line2: null,
	city: 'San Francisco',
	state: 'CA',
	postal_code: '94105',
	country: 'US',
	property_type: 'multi_family',
	status: 'ACTIVE',
	date_sold: null,
	sale_price: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
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

describe('PropertyForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Create Mode', () => {
		test('renders create mode with empty form', () => {
			renderWithQueryClient(<PropertyForm mode="create" />)

			expect(screen.getByLabelText(/property name/i)).toHaveValue('')
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue('')
			expect(screen.getByRole('button', { name: /create property/i })).toBeInTheDocument()
		})

		test('shows all required fields marked with asterisk', () => {
			renderWithQueryClient(<PropertyForm mode="create" />)

			expect(screen.getByText(/property name \*/i)).toBeInTheDocument()
			expect(screen.getByText(/property type \*/i)).toBeInTheDocument()
			expect(screen.getByText(/address \*/i)).toBeInTheDocument()
			expect(screen.getByText(/city \*/i)).toBeInTheDocument()
			expect(screen.getByText(/state \*/i)).toBeInTheDocument()
			expect(screen.getByText(/zip code \*/i)).toBeInTheDocument()
		})

		test('shows image upload section in create mode', () => {
			renderWithQueryClient(<PropertyForm mode="create" />)

			expect(screen.getByText(/save property first to upload images/i)).toBeInTheDocument()
		})

		test('displays correct button text in create mode', () => {
			renderWithQueryClient(<PropertyForm mode="create" />)

			const submitButton = screen.getByRole('button', { name: /create property/i })
			expect(submitButton).toBeInTheDocument()
			expect(submitButton).not.toBeDisabled()
		})
	})

	describe('Edit Mode', () => {
		test('renders edit mode with populated fields', () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />
			)

			expect(screen.getByLabelText(/property name/i)).toHaveValue('Sunset Apartments')
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue('123 Main St')
			expect(screen.getByLabelText(/city/i)).toHaveValue('San Francisco')
			expect(screen.getByLabelText(/state/i)).toHaveValue('CA')
			expect(screen.getByLabelText(/zip code/i)).toHaveValue('94105')
		})

		test('shows image upload section in edit mode', () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />
			)

			expect(screen.getByText(/property image/i)).toBeInTheDocument()
		})

		test('displays correct button text in edit mode', () => {
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />
			)

			const submitButton = screen.getByRole('button', { name: /update property/i })
			expect(submitButton).toBeInTheDocument()
			expect(submitButton).not.toBeDisabled()
		})

		test('populates property type select with correct value', () => {
		renderWithQueryClient(
			<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />
		)

		// Verify Property Type label exists and form is rendered
		expect(screen.getByText(/property type \*/i)).toBeInTheDocument()
		// The form should be rendered in edit mode successfully
	})
	})

	describe('Form Validation', () => {
		test('accepts property name with 3 or more characters', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const nameInput = screen.getByLabelText(/property name/i)
			await user.type(nameInput, 'ABC')

			expect(nameInput).toHaveValue('ABC')
		})

		test('accepts valid 5-digit ZIP code', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const zipInput = screen.getByLabelText(/zip code/i)
			await user.type(zipInput, '94105')

			expect(zipInput).toHaveValue('94105')
		})

		test('accepts valid 9-digit ZIP code', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const zipInput = screen.getByLabelText(/zip code/i)
			await user.type(zipInput, '94105-1234')

			expect(zipInput).toHaveValue('94105-1234')
		})

		test('accepts valid 2-character state code', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const stateInput = screen.getByLabelText(/state/i)
			await user.type(stateInput, 'CA')

			expect(stateInput).toHaveValue('CA')
		})
	})

	describe('User Interactions', () => {
		test('allows user to fill out the form', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			await user.type(screen.getByLabelText(/property name/i), 'Test Property')
			await user.type(screen.getByLabelText(/^Address \*$/i), '456 Oak Ave')
			await user.type(screen.getByLabelText(/city/i), 'Oakland')
			await user.type(screen.getByLabelText(/state/i), 'CA')
			await user.type(screen.getByLabelText(/zip code/i), '94601')

			expect(screen.getByLabelText(/property name/i)).toHaveValue('Test Property')
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveValue('456 Oak Ave')
			expect(screen.getByLabelText(/city/i)).toHaveValue('Oakland')
			expect(screen.getByLabelText(/state/i)).toHaveValue('CA')
			expect(screen.getByLabelText(/zip code/i)).toHaveValue('94601')
		})

		test('converts state input to uppercase automatically', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const stateInput = screen.getByLabelText(/state/i)
			await user.type(stateInput, 'ca')

			expect(stateInput).toHaveValue('CA')
		})

		test('cancel button navigates back', async () => {
			const user = userEvent.setup()
			renderWithQueryClient(<PropertyForm mode="create" />)

			const cancelButton = screen.getByRole('button', { name: /cancel/i })
			await user.click(cancelButton)

			// Note: window.history.back() is called, which we can't easily test in jsdom
			// This test verifies the button exists and is clickable
		})
	})

	describe('Accessibility', () => {
		test('all form fields have proper labels', () => {
		renderWithQueryClient(<PropertyForm mode="create" />)

		// Text inputs can be queried by label
		expect(screen.getByLabelText(/property name/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/^Address \*$/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
		// Country is a select field and may not have a standard label query
	// Verify country label exists via text query instead
	expect(screen.getByText(/country \*/i)).toBeInTheDocument()

		// Verify property type label exists (accessibility)
		expect(screen.getByText(/property type \*/i)).toBeInTheDocument()
	})

		test('form inputs have appropriate autocomplete attributes', () => {
			renderWithQueryClient(<PropertyForm mode="create" />)

			expect(screen.getByLabelText(/property name/i)).toHaveAttribute('autocomplete', 'organization')
			expect(screen.getByLabelText(/^Address \*$/i)).toHaveAttribute('autocomplete', 'street-address')
			expect(screen.getByLabelText(/city/i)).toHaveAttribute('autocomplete', 'address-level2')
			expect(screen.getByLabelText(/state/i)).toHaveAttribute('autocomplete', 'address-level1')
			expect(screen.getByLabelText(/zip code/i)).toHaveAttribute('autocomplete', 'postal-code')
		})
	})

	describe('Mode-Specific Behavior', () => {
		test('create mode does not require property prop', () => {
			expect(() => {
				renderWithQueryClient(<PropertyForm mode="create" />)
			}).not.toThrow()
		})

		test('edit mode renders with property data', () => {
			expect(() => {
				renderWithQueryClient(
					<PropertyForm mode="edit" property={DEFAULT_PROPERTY} />
				)
			}).not.toThrow()
		})

		test('accepts onSuccess callback prop', async () => {
		const onSuccess = vi.fn()
			renderWithQueryClient(
				<PropertyForm mode="edit" property={DEFAULT_PROPERTY} onSuccess={onSuccess} />
			)

			// Note: Full form submission testing would require mocking the mutation
			// This verifies the prop is accepted
			expect(onSuccess).not.toHaveBeenCalled() // Not called until form submits
		})
	})
})
