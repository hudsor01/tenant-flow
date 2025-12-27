import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppSidebar } from '#components/dashboard/app-sidebar'
import { SidebarProvider } from '#components/ui/sidebar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	usePathname: vi.fn(() => '/dashboard'),
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

describe('AppSidebar Navigation', () => {
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

	it('renders all core navigation sections', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Test core navigation items (Dashboard, Properties, Tenants, Leases, Maintenance)
		expect(screen.getByText('Dashboard')).toBeInTheDocument()
		expect(screen.getByText('Properties')).toBeInTheDocument()
		expect(screen.getByText('Tenants')).toBeInTheDocument()
		expect(screen.getByText('Leases')).toBeInTheDocument()
		expect(screen.getByText('Maintenance')).toBeInTheDocument()
	})

	it('renders analytics section with collapsible items', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Test collapsible sections (Analytics, Reports, Financials)
		expect(screen.getByText('Analytics')).toBeInTheDocument()
		expect(screen.getByText('Reports')).toBeInTheDocument()
		expect(screen.getByText('Financials')).toBeInTheDocument()
	})

	it('renders documents section', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Test document items
		expect(screen.getByText('Generate Lease')).toBeInTheDocument()
		expect(screen.getByText('Lease Template')).toBeInTheDocument()
	})

	it('renders secondary navigation', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Test secondary items (Settings, Get Help, Search)
		expect(screen.getByText('Settings')).toBeInTheDocument()
		expect(screen.getByText('Get Help')).toBeInTheDocument()
		expect(screen.getByText('Search')).toBeInTheDocument()
	})

	it('renders TenantFlow logo and branding', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		expect(screen.getByText('TenantFlow')).toBeInTheDocument()
	})

	it('renders user menu in footer', () => {
		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// NavUser component should render in SidebarFooter
		const userMenu = screen.getByTestId('user-menu')
		expect(userMenu).toBeInTheDocument()
	})
})
