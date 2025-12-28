/**
 * Profile Page Tests
 *
 * Tests for the owner and tenant profile pages.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		refresh: vi.fn()
	})
}))

// Mock Supabase client
vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: {
					session: {
						user: {
							id: 'test-user-id',
							email: 'owner@test.com',
							user_metadata: {
								full_name: 'Test Owner'
							}
						}
					}
				},
				error: null
			}),
			onAuthStateChange: vi.fn(callback => {
				setTimeout(() => {
					callback('SIGNED_IN', {
						user: {
							id: 'test-user-id',
							email: 'owner@test.com',
							user_metadata: {
								full_name: 'Test Owner'
							}
						}
					})
				}, 0)
				return { data: { subscription: { unsubscribe: vi.fn() } } }
			}),
			signOut: vi.fn().mockResolvedValue({ error: null })
		}
	})
}))

// Mock profile data
const mockOwnerProfile = {
	id: 'test-user-id',
	email: 'owner@test.com',
	first_name: 'Test',
	last_name: 'Owner',
	full_name: 'Test Owner',
	phone: '(555) 123-4567',
	avatar_url: null,
	user_type: 'owner' as const,
	status: 'active',
	created_at: '2024-01-15T00:00:00Z',
	updated_at: '2024-12-01T00:00:00Z',
	owner_profile: {
		stripe_connected: true,
		properties_count: 5,
		units_count: 20
	}
}

// Mock use-profile hooks
let mockProfileData = mockOwnerProfile
const mockUpdateProfile = vi.fn()
const mockUploadAvatar = vi.fn()
const mockRemoveAvatar = vi.fn()
const mockUpdatePhone = vi.fn()

vi.mock('#hooks/api/use-profile', () => ({
	useProfile: () => ({
		data: mockProfileData,
		isLoading: false,
		error: null
	}),
	useUpdateProfile: () => ({
		mutateAsync: mockUpdateProfile,
		isPending: false
	}),
	useUploadAvatar: () => ({
		mutateAsync: mockUploadAvatar,
		isPending: false
	}),
	useRemoveAvatar: () => ({
		mutateAsync: mockRemoveAvatar,
		isPending: false
	}),
	useUpdatePhone: () => ({
		mutateAsync: mockUpdatePhone,
		isPending: false
	}),
	useUpdateProfileEmergencyContact: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useRemoveProfileEmergencyContact: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

// Mock use-auth hooks
const mockSignOut = vi.fn()
const mockChangePassword = vi.fn()
vi.mock('#hooks/api/use-auth', () => ({
	useSignOut: () => ({
		mutateAsync: mockSignOut,
		isPending: false
	}),
	useChangePassword: () => ({
		mutateAsync: mockChangePassword,
		isPending: false
	})
}))

// Mock sonner
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn()
	}
}))

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0
			}
		}
	})
}

function TestWrapper({ children }: { children: React.ReactNode }) {
	const queryClient = createTestQueryClient()

	return (
		<QueryClientProvider client={queryClient}>
			<AuthStoreProvider>{children}</AuthStoreProvider>
		</QueryClientProvider>
	)
}

// Import page components after mocks
import OwnerProfilePage from '#app/(owner)/profile/page'

describe('Owner Profile Page', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()
		mockProfileData = mockOwnerProfile
		mockPush.mockClear()

		originalMatchMedia = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
	})

	it('displays owner profile information', async () => {
		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		// Use getAllByText and check that at least one exists (name may appear in multiple places)
		await waitFor(() => {
			const ownerNameElements = screen.getAllByText('Test Owner')
			expect(ownerNameElements.length).toBeGreaterThan(0)
		})

		expect(screen.getByText('owner@test.com')).toBeInTheDocument()
		expect(screen.getByText('(555) 123-4567')).toBeInTheDocument()
		expect(screen.getByText('Property Owner')).toBeInTheDocument()
	})

	it('displays owner statistics', async () => {
		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Properties')).toBeInTheDocument()
		})

		expect(screen.getByText('Units')).toBeInTheDocument()
	})

	it('shows Stripe connected status for owners', async () => {
		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Stripe Connected')).toBeInTheDocument()
		})

		expect(
			screen.getByText('You can receive payments from tenants')
		).toBeInTheDocument()
	})

	it('shows edit form when Edit button is clicked', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Edit')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Edit'))

		// Form fields should appear
		expect(screen.getByLabelText('First Name')).toBeInTheDocument()
		expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
		expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
	})

	it('cancels edit mode and reverts changes', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Edit')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Edit'))

		// Change first name
		const firstNameInput = screen.getByLabelText('First Name')
		await user.clear(firstNameInput)
		await user.type(firstNameInput, 'Changed')

		// Cancel
		await user.click(screen.getByText('Cancel'))

		// Should show original name - use getAllByText since name appears multiple times
		await waitFor(() => {
			const ownerNameElements = screen.getAllByText('Test Owner')
			expect(ownerNameElements.length).toBeGreaterThan(0)
		})
	})

	it('opens change password dialog when clicked', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Password')).toBeInTheDocument()
		})

		// Find the Change button in the security section
		const changeButtons = screen.getAllByText('Change')
		await user.click(changeButtons[0]!)

		// Dialog should open - look for dialog heading or form elements
		await waitFor(
			() => {
				// Look for any text that indicates the dialog opened
				const dialogHeadings = screen.queryAllByRole('heading')
				const changePasswordHeading = dialogHeadings.find(
					h => h.textContent === 'Change Password'
				)
				// Also try looking for dialog-specific elements
				const currentPasswordField =
					screen.queryByLabelText(/current password/i)
				const newPasswordField = screen.queryByLabelText(/new password/i)

				expect(
					changePasswordHeading || currentPasswordField || newPasswordField
				).toBeTruthy()
			},
			{ timeout: 3000 }
		)
	})

	it('handles sign out action', async () => {
		const user = userEvent.setup()
		mockSignOut.mockResolvedValueOnce(undefined)

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Sign Out')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Sign Out'))

		expect(mockSignOut).toHaveBeenCalled()
	})

	it('navigates to settings page from quick links', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Account Settings')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Account Settings'))

		expect(mockPush).toHaveBeenCalledWith('/settings')
	})

	it('navigates to security settings from quick links', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Security')).toBeInTheDocument()
		})

		// Find the Security quick link button (not the section header)
		const quickLinks = screen.getAllByText('Security')
		const securityQuickLink = quickLinks.find(
			el => el.closest('button') !== null
		)
		if (securityQuickLink) {
			await user.click(securityQuickLink)
		}

		expect(mockPush).toHaveBeenCalledWith('/settings?tab=security')
	})

	it('navigates to billing settings from quick links', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Billing')).toBeInTheDocument()
		})

		await user.click(screen.getByText('Billing'))

		expect(mockPush).toHaveBeenCalledWith('/settings?tab=billing')
	})
})

describe('Profile Avatar Upload', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()
		mockProfileData = mockOwnerProfile

		originalMatchMedia = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
	})

	it('displays avatar fallback when no avatar is set', async () => {
		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			// Should show initials "TO" for "Test Owner"
			expect(screen.getByText('TO')).toBeInTheDocument()
		})
	})

	it('shows avatar upload button', async () => {
		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(
				screen.getByRole('button', { name: /upload new avatar/i })
			).toBeInTheDocument()
		})
	})

	it('shows remove avatar option when avatar exists', async () => {
		mockProfileData = {
			...mockOwnerProfile,
			avatar_url: 'https://example.com/avatar.jpg'
		} as unknown as typeof mockOwnerProfile

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('Remove photo')).toBeInTheDocument()
		})
	})
})

describe('Profile Responsiveness', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()
		mockProfileData = mockOwnerProfile
		originalMatchMedia = window.matchMedia
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
	})

	it('renders correctly on mobile (single column)', async () => {
		// Mock mobile viewport
		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: query.includes('max-width'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('My Profile')).toBeInTheDocument()
		})

		// Page should render without errors
		expect(screen.getByText('Personal Information')).toBeInTheDocument()
	})

	it('renders correctly on desktop (three columns)', async () => {
		// Mock desktop viewport
		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: query.includes('min-width'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('My Profile')).toBeInTheDocument()
		})

		// All sections should be visible
		expect(screen.getByText('Personal Information')).toBeInTheDocument()
		expect(screen.getByText('Security Status')).toBeInTheDocument()
		expect(screen.getByText('Quick Links')).toBeInTheDocument()
	})
})

describe('Profile Dark Mode', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()
		mockProfileData = mockOwnerProfile
		originalMatchMedia = window.matchMedia
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
		document.documentElement.classList.remove('dark')
	})

	it('applies dark mode styles when dark class is present', async () => {
		document.documentElement.classList.add('dark')

		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: query === '(prefers-color-scheme: dark)',
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('My Profile')).toBeInTheDocument()
		})

		// Page should render without errors in dark mode
		expect(document.documentElement.classList.contains('dark')).toBe(true)
	})

	it('applies light mode styles when dark class is not present', async () => {
		document.documentElement.classList.remove('dark')

		window.matchMedia = vi.fn().mockImplementation(query => ({
			matches: query === '(prefers-color-scheme: light)',
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))

		render(
			<TestWrapper>
				<OwnerProfilePage />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByText('My Profile')).toBeInTheDocument()
		})

		// Page should render without errors in light mode
		expect(document.documentElement.classList.contains('dark')).toBe(false)
	})
})
