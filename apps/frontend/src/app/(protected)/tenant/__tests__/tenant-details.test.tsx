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
const mockUseMarkTenantAsMovedOut = jest.fn()

jest.mock('@/hooks/api/use-tenant', () => ({
	useTenant: () => mockUseTenant(),
	useDeleteTenant: (options?: {
		onSuccess?: () => void
		onError?: (error: Error) => void
	}) => mockUseDeleteTenant(options),
	// Provide mark-as-moved-out mutation hook so component tests don't
	// receive undefined when they don't explicitly mock it.
	useMarkTenantAsMovedOut: () => mockUseMarkTenantAsMovedOut()
}))

describe('TenantDetails', () => {
	// Use native object literal - no factory abstraction
	const defaultTenant: Tenant = DEFAULT_TENANT

	beforeEach(() => {
		jest.clearAllMocks()
		mockRouter.push.mockClear()
		// Default mocks for mutation hooks used by the component
		mockUseDeleteTenant.mockReturnValue(
			createMockMutation({ isPending: false })
		)
		mockUseMarkTenantAsMovedOut.mockReturnValue(
			createMockMutation({ isPending: false })
		)
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

	describe('Move-out Functionality', () => {
		beforeEach(() => {
			mockUseTenant.mockReturnValue(
				createMockQuery({ data: defaultTenant, isLoading: false })
			)
		})

		test('opens move-out dialog', async () => {
			const user = userEvent.setup()
			mockUseMarkTenantAsMovedOut.mockReturnValue(
				createMockMutation({ isPending: false })
			)

			render(<TenantDetails id="tenant-1" />)

			// Act - click the Mark as Moved Out button
			const moveOutButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(moveOutButton)

			// Assert - dialog appears with title
			expect(
				await screen.findByText('Mark Tenant as Moved Out')
			).toBeInTheDocument()
		})

		test('marks tenant as moved out successfully', async () => {
			const user = userEvent.setup()
			const mutateFn = jest.fn()

			mockUseMarkTenantAsMovedOut.mockImplementation(options => ({
				mutate: (vars: unknown) => {
					mutateFn(vars)
					options?.onSuccess?.()
				},
				mutateAsync: async (vars: unknown) => {
					mutateFn(vars)
					if (options?.onSuccess) {
						options.onSuccess()
					}
					return Promise.resolve()
				},
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				reset: jest.fn()
			}))

			render(<TenantDetails id="tenant-1" />)

			// Open dialog
			const moveOutButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(moveOutButton)

			// Fill form fields
			const dateInput = await screen.findByLabelText('Move Out Date *')
			await user.type(dateInput, '2025-12-31')

			const reasonTrigger = screen.getByRole('combobox', { name: /Reason \*/i })
			// open the select and choose the first item
			await user.click(reasonTrigger)
			const leaseExpired = await screen.findByText('Lease Expired')
			await user.click(leaseExpired)

			const confirmButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(confirmButton)

			expect(mutateFn).toHaveBeenCalledWith({
				id: 'tenant-1',
				data: {
					moveOutDate: '2025-12-31',
					moveOutReason: 'lease_expired'
				}
			})
			expect(toast.success).toHaveBeenCalledWith('Tenant marked as moved out')
			expect(mockRouter.push).toHaveBeenCalledWith('/manage/tenants')
		})

		test('handles move-out error gracefully', async () => {
			const user = userEvent.setup()
			const error = new Error('Move-out failed')

			mockUseMarkTenantAsMovedOut.mockImplementation(options => ({
				mutateAsync: async () => {
					if (options?.onError) {
						options.onError(error)
					}
					return Promise.reject(error)
				},
				mutate: () => {
					options?.onError?.(error)
				},
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				reset: jest.fn()
			}))

			render(<TenantDetails id="tenant-1" />)

			const moveOutButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(moveOutButton)

			const dateInput = await screen.findByLabelText('Move Out Date *')
			await user.type(dateInput, '2025-12-31')

			const reasonTrigger = screen.getByRole('combobox', { name: /Reason \*/i })
			await user.click(reasonTrigger)
			const leaseExpired = await screen.findByText('Lease Expired')
			await user.click(leaseExpired)

			const confirmButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(confirmButton)

			expect(toast.error).toHaveBeenCalledWith(
				'Failed to mark tenant as moved out',
				{
					description: 'Move-out failed'
				}
			)
		})

		test('shows processing state during mutation', async () => {
			const user = userEvent.setup()

			mockUseMarkTenantAsMovedOut.mockReturnValue(
				createMockMutation({ isPending: true })
			)

			render(<TenantDetails id="tenant-1" />)

			const moveOutButton = screen.getByRole('button', {
				name: /Mark as Moved Out/i
			})
			await user.click(moveOutButton)

			// Confirm button should show processing label and be disabled
			const processingButton = await screen.findByRole('button', {
				name: /Processing.../i
			})
			expect(processingButton).toBeDisabled()
		})
	})
})
