import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { SidebarProvider } from '#components/ui/sidebar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	usePathname: vi.fn(() => '/tenant'),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		refresh: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn()
	}))
}))

// Mock Supabase client
vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: null },
				error: null
			}),
			onAuthStateChange: vi.fn().mockReturnValue({
				data: {
					subscription: {
						unsubscribe: vi.fn()
					}
				}
			})
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

describe('TenantSidebar Navigation', () => {
	let originalMatchMedia: typeof window.matchMedia

	beforeEach(() => {
		vi.clearAllMocks()

		// Store original and mock matchMedia
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
		// Restore original
		window.matchMedia = originalMatchMedia
	})

	it('renders all core tenant navigation items', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		// Test core navigation items per spec
		expect(screen.getByText('Dashboard')).toBeInTheDocument()
		expect(screen.getByText('My Profile')).toBeInTheDocument()
		expect(screen.getByText('My Lease')).toBeInTheDocument()
		expect(screen.getByText('Maintenance')).toBeInTheDocument()
		expect(screen.getByText('Documents')).toBeInTheDocument()
	})

	it('renders payments section with collapsible items', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		// Payments should be collapsible
		expect(screen.getByText('Payments')).toBeInTheDocument()
	})

	it('renders secondary navigation', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		// Test secondary items (Settings, Get Help)
		expect(screen.getByText('Settings')).toBeInTheDocument()
		expect(screen.getByText('Get Help')).toBeInTheDocument()
	})

	it('renders TenantFlow logo and branding', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		expect(screen.getByText('TenantFlow')).toBeInTheDocument()
	})

	it('renders user menu in footer', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		// NavUser component should render in SidebarFooter
		const userMenu = screen.getByTestId('user-menu')
		expect(userMenu).toBeInTheDocument()
	})

	it('has correct data-tour attribute', () => {
		render(
			<TestWrapper>
				<TenantSidebar />
			</TestWrapper>
		)

		const sidebar = document.querySelector('[data-tour="tenant-sidebar-nav"]')
		expect(sidebar).toBeInTheDocument()
	})
})
