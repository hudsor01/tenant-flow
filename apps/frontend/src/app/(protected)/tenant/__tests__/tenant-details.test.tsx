/**
 * TenantDetails Component Tests
 * Tests tenant profile display, deletion workflows, and date formatting
 *
 * @jest-environment jsdom
 */

import {
	DEFAULT_TENANT,
	createMockMutation,
	createMockQuery,
	render,
	screen,
	userEvent,
	waitFor
} from '@/test/utils'
import type { Tenant } from '@repo/shared/types/core'
import { TenantDetails } from '../tenant-details.client'

// Mock Next.js router
const mockPush = jest.fn()
const mockRouter = {
	push: mockPush,
	replace: jest.fn(),
	prefetch: jest.fn(),
	back: jest.fn()
}

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	usePathname: () => '/manage/tenants/tenant-1'
}))

// Mock sonner toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	}
}))

import { toast } from 'sonner'

// Mock tenant hooks
const mockUseTenant = jest.fn()
const mockUseDeleteTenant = jest.fn()

jest.mock('@/hooks/api/use-tenant', () => ({
	useTenant: () => mockUseTenant(),
	useDeleteTenant: (options?: {
		onSuccess?: () => void
		onError?: (error: Error) => void
	}) => mockUseDeleteTenant(options)
}))

describe('TenantDetails', () => {
	// Use native object literal - no factory abstraction
	const defaultTenant: Tenant = DEFAULT_TENANT

	beforeEach(() => {
		jest.clearAllMocks()
		mockRouter.push.mockClear()
	})

	describe('Loading and Error States', () => {
		test('renders loading skeleton while fetching tenant data', () => {
			// Arrange
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: undefined, isLoading: true })
			)
			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: false })
			)

			// Act
			const { container } = render(<TenantDetails id="tenant-1" />)

			// Assert - skeleton should render without tenant data
			expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
			expect(container.querySelector('.space-y-6')).toBeInTheDocument()
		})

		test('renders error message when tenant is not found', () => {
			// Arrange
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: null, isError: true })
			)
			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: false })
			)

			// Act
			render(<TenantDetails id="invalid-id" />)

			// Assert
			expect(screen.getByText('Tenant Not Found')).toBeInTheDocument()
			expect(
				screen.getByText(/doesn't exist or there was a problem/i)
			).toBeInTheDocument()
		})
	})

	describe('Display and Rendering', () => {
		beforeEach(() => {
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: defaultTenant, isLoading: false })
			)
			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: false })
			)
		})

		test('renders tenant details successfully', async () => {
			// Act
			render(<TenantDetails id="tenant-1" />)

			// Assert
			await waitFor(() => {
				expect(screen.getByText('John Doe')).toBeInTheDocument()
			})

			const emails = screen.getAllByText('john.doe@example.com')
			expect(emails[0]).toBeInTheDocument()

			const phones = screen.getAllByText('(555) 123-4567')
			expect(phones[0]).toBeInTheDocument()
		})

		test('displays tenant contact information', () => {
			// Act
			render(<TenantDetails id="tenant-1" />)

			// Assert
			const emails = screen.getAllByText('john.doe@example.com')
			expect(emails[0]).toBeInTheDocument()

			const phones = screen.getAllByText('(555) 123-4567')
			expect(phones[0]).toBeInTheDocument()

			expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
		})

		test('displays created and updated dates', () => {
			// Act
			render(<TenantDetails id="tenant-1" />)

			// Assert
			expect(screen.getByText('Created')).toBeInTheDocument()
			expect(screen.getByText('Updated')).toBeInTheDocument()

			const formattedDate = new Date(
				defaultTenant.createdAt
			).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})

			const dateElements = screen.getAllByText(formattedDate)
			expect(dateElements.length).toBeGreaterThanOrEqual(1)
		})

		test('renders tenant without emergency contact', () => {
			// Arrange
			const tenantWithoutContact: Tenant = {
				...DEFAULT_TENANT,
				emergencyContact: null
			}
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: tenantWithoutContact, isLoading: false })
			)

			// Act
			render(<TenantDetails id="tenant-1" />)

			// Assert
			expect(screen.queryByText('Emergency Contact')).not.toBeInTheDocument()
		})
	})

	describe('Actions and Navigation', () => {
		beforeEach(() => {
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: defaultTenant, isLoading: false })
			)
			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: false })
			)
		})

		test('has edit button that links to edit page', () => {
			// Act
			render(<TenantDetails id="tenant-1" />)

			// Assert
			const editButton = screen.getByRole('link', { name: /Edit/i })
			expect(editButton).toHaveAttribute(
				'href',
				'/manage/tenants/tenant-1/edit'
			)
		})
	})

	describe('Delete Functionality', () => {
		beforeEach(() => {
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: defaultTenant, isLoading: false })
			)
		})

		test('opens delete confirmation dialog', async () => {
			// Arrange
			const user = userEvent.setup()
			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: false })
			)

			render(<TenantDetails id="tenant-1" />)

			// Act - click delete button to open dialog
			const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
			const deleteButton = deleteButtons[0]
			if (!deleteButton) throw new Error('Delete button not found')
			await user.click(deleteButton)

			// Assert - dialog appears in portal
			await waitFor(async () => {
				expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
			})

			const deleteTenantTexts = screen.getAllByText('Delete Tenant')
			expect(deleteTenantTexts.length).toBeGreaterThanOrEqual(1)
			expect(
				screen.getByText(/Are you sure you want to delete/i)
			).toBeInTheDocument()
		})

		test('deletes tenant successfully', async () => {
			// Arrange
			const user = userEvent.setup()
			const mutateFn = jest.fn()

			mockUseDeleteTenant.mockImplementation(options => ({
				mutate: (id: string) => {
					mutateFn(id)
					options?.onSuccess?.()
				},
				mutateAsync: jest.fn(),
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				reset: jest.fn()
			}))

			render(<TenantDetails id="tenant-1" />)

			// Act - open dialog and confirm deletion
			const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
			const deleteButton = deleteButtons[0]
			if (!deleteButton) throw new Error('Delete button not found')
			await user.click(deleteButton)

			const confirmButton = await screen.findByRole('button', {
				name: /Delete Tenant/i
			})
			await user.click(confirmButton)

			// Assert - mutation called and navigation occurs
			expect(mutateFn).toHaveBeenCalledWith('tenant-1')
			expect(toast.success).toHaveBeenCalledWith('Tenant deleted successfully')
			expect(mockRouter.push).toHaveBeenCalledWith('/manage/tenants')
		})

		test('handles delete error gracefully', async () => {
			// Arrange
			const user = userEvent.setup()
			const error = new Error('Delete failed')

			mockUseDeleteTenant.mockImplementation(options => ({
				mutate: () => {
					options?.onError?.(error)
				},
				mutateAsync: jest.fn(),
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				reset: jest.fn()
			}))

			render(<TenantDetails id="tenant-1" />)

			// Act - attempt deletion
			const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
			const deleteButton = deleteButtons[0]
			if (!deleteButton) throw new Error('Delete button not found')
			await user.click(deleteButton)

			const confirmButton = await screen.findByRole('button', {
				name: /Delete Tenant/i
			})
			await user.click(confirmButton)

			// Assert - error toast displayed
			expect(toast.error).toHaveBeenCalledWith('Failed to delete tenant', {
				description: 'Delete failed'
			})
		})

		test('shows deleting state during mutation', async () => {
			// Arrange
			const user = userEvent.setup()

			mockUseDeleteTenant.mockReturnValue(
				createMockMutation({ isPending: true })
			)

			render(<TenantDetails id="tenant-1" />)

			// Act - open delete dialog
			const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
			const deleteButton = deleteButtons[0]
			if (!deleteButton) throw new Error('Delete button not found')
			await user.click(deleteButton)

			// Assert - confirm button shows loading state
			await waitFor(async () => {
				expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
			})

			const confirmButton = screen.getByRole('button', { name: /Deleting/i })
			expect(confirmButton).toBeDisabled()
		})
	})
})
