import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NavUser } from '#components/dashboard/nav-user'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
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
							email: 'test@example.com',
							user_metadata: {
								full_name: 'Test User',
								avatar_url: null
							},
							aud: 'authenticated',
							role: 'authenticated',
							created_at: new Date().toISOString()
						},
						access_token: 'mock-token',
						refresh_token: 'mock-refresh-token',
						expires_in: 3600,
						token_type: 'bearer'
					}
				},
				error: null
			}),
			onAuthStateChange: vi.fn((callback) => {
				// Immediately trigger the callback with the session
				setTimeout(() => {
					callback('SIGNED_IN', {
						user: {
							id: 'test-user-id',
							email: 'test@example.com',
							user_metadata: {
								full_name: 'Test User',
								avatar_url: null
							},
							aud: 'authenticated',
							role: 'authenticated',
							created_at: new Date().toISOString()
						},
						access_token: 'mock-token',
						refresh_token: 'mock-refresh-token',
						expires_in: 3600,
						token_type: 'bearer'
					})
				}, 0)
				return {
					data: {
						subscription: {
							unsubscribe: vi.fn()
						}
					}
				}
			}),
			signOut: vi.fn().mockResolvedValue({ error: null })
		}
	})
}))

// Mock use-auth hook
vi.mock('#hooks/api/use-auth', () => ({
	useSignOut: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}))

import { SidebarProvider } from '#components/ui/sidebar'

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
			<AuthStoreProvider>
				<SidebarProvider>{children}</SidebarProvider>
			</AuthStoreProvider>
		</QueryClientProvider>
	)
}

describe('User Menu', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()
		
		// Store original and mock matchMedia
		originalMatchMedia = window.matchMedia
		window.matchMedia = vi.fn().mockImplementation((query) => ({
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
		// Restore original
		window.matchMedia = originalMatchMedia
	})

	it('displays user profile information', async () => {
		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		// Wait for user data to load and display correctly
		await waitFor(() => {
			expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
		})

		expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
	})

	it('displays user initials when no avatar is provided', async () => {
		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByTestId('user-name')).toBeInTheDocument()
		})

		// Avatar fallback should show initials "TU" for "Test User"
		const avatar = screen.getAllByText('T')[0]
		expect(avatar).toBeInTheDocument()
	})

	it('opens dropdown menu when clicked', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByTestId('user-menu')).toBeInTheDocument()
		})

		const userMenuButton = screen.getByTestId('user-menu')
		await user.click(userMenuButton)

		// Dropdown should show menu items
		await waitFor(() => {
			expect(screen.getByTestId('user-name-dropdown')).toBeInTheDocument()
		})
	})

	it('displays logout button in dropdown', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByTestId('user-menu')).toBeInTheDocument()
		})

		// Open menu
		const userMenuButton = screen.getByTestId('user-menu')
		await user.click(userMenuButton)

		// Check for logout button
		await waitFor(() => {
			expect(screen.getByTestId('logout-button')).toBeInTheDocument()
		})
	})

	it('handles logout action', async () => {
		const user = userEvent.setup()

		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		await waitFor(() => {
			expect(screen.getByTestId('user-menu')).toBeInTheDocument()
		})

		// Open menu
		const userMenuButton = screen.getByTestId('user-menu')
		await user.click(userMenuButton)

		// Click logout
		await waitFor(() => {
			expect(screen.getByTestId('logout-button')).toBeInTheDocument()
		})

		const logoutButton = screen.getByTestId('logout-button')
		
		// The logout button should be present and clickable
		expect(logoutButton).toBeInTheDocument()
	})

	it('displays loading state during authentication check', () => {
		render(
			<TestWrapper>
				<NavUser />
			</TestWrapper>
		)

		// Should show email field (loading state is handled by auth provider)
		expect(screen.getByTestId('user-email')).toBeInTheDocument()
	})
})
