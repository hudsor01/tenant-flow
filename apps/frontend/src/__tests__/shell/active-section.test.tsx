import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '#components/dashboard/app-sidebar'
import { SidebarProvider } from '#components/ui/sidebar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	usePathname: vi.fn(),
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

describe('Active Section Highlighting', () => {
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

	it('highlights Dashboard when on dashboard route', () => {
		vi.mocked(usePathname).mockReturnValue('/dashboard')

		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const dashboardLink = screen.getByText('Dashboard').closest('a')
		expect(dashboardLink).toHaveAttribute('href', '/dashboard')
	})

	it('highlights Properties when on properties route', () => {
		vi.mocked(usePathname).mockReturnValue('/properties')

		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const propertiesLink = screen.getByText('Properties').closest('a')
		expect(propertiesLink).toHaveAttribute('href', '/properties')
	})

	it('highlights Tenants when on tenants route', () => {
		vi.mocked(usePathname).mockReturnValue('/tenants')

		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const tenantsLink = screen.getByText('Tenants').closest('a')
		expect(tenantsLink).toHaveAttribute('href', '/tenants')
	})

	it('highlights Leases when on leases route', () => {
		vi.mocked(usePathname).mockReturnValue('/leases')

		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const leasesLink = screen.getByText('Leases').closest('a')
		expect(leasesLink).toHaveAttribute('href', '/leases')
	})

	it('highlights Maintenance when on maintenance route', () => {
		vi.mocked(usePathname).mockReturnValue('/maintenance')

		render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const maintenanceLink = screen.getByText('Maintenance').closest('a')
		expect(maintenanceLink).toHaveAttribute('href', '/maintenance')
	})

	it('updates active state when route changes', () => {
		const { rerender } = render(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Start on dashboard
		vi.mocked(usePathname).mockReturnValue('/dashboard')
		rerender(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		// Navigate to properties
		vi.mocked(usePathname).mockReturnValue('/properties')
		rerender(
			<TestWrapper>
				<AppSidebar />
			</TestWrapper>
		)

		const propertiesLink = screen.getByText('Properties').closest('a')
		expect(propertiesLink).toHaveAttribute('href', '/properties')
	})
})
