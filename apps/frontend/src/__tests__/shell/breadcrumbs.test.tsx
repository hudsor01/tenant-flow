import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OwnerDashboardLayoutClient } from '#app/(owner)/owner-dashboard-layout-client'
import { usePathname } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '#components/ui/sidebar'
import { AuthStoreProvider } from '#providers/auth-provider'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
	usePathname: vi.fn(),
	useRouter: () => ({
		push: mockPush
	})
}))

// Mock SSE hook
vi.mock('#hooks/use-sse', () => ({
	useSse: vi.fn()
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

describe('Breadcrumbs', () => {
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

	it('displays breadcrumbs for dashboard route', () => {
		vi.mocked(usePathname).mockReturnValue('/dashboard')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Should show "Dashboard" breadcrumb
		expect(screen.getByText('Dashboard')).toBeInTheDocument()
	})

	it('displays breadcrumbs for nested properties route', () => {
		vi.mocked(usePathname).mockReturnValue('/properties/123')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Should show "Properties" and property ID
		expect(screen.getByText('Properties')).toBeInTheDocument()
		expect(screen.getByText('123')).toBeInTheDocument()
	})

	it('displays breadcrumbs for deeply nested routes', () => {
		vi.mocked(usePathname).mockReturnValue('/properties/123/units/456')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Should show full hierarchy
		expect(screen.getByText('Properties')).toBeInTheDocument()
		expect(screen.getByText('123')).toBeInTheDocument()
		expect(screen.getByText('Units')).toBeInTheDocument()
		expect(screen.getByText('456')).toBeInTheDocument()
	})

	it('makes parent breadcrumbs clickable', async () => {
		const user = userEvent.setup()
		vi.mocked(usePathname).mockReturnValue('/properties/123/units')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// "Properties" should be clickable
		const propertiesLink = screen.getByRole('link', { name: 'Properties' })
		expect(propertiesLink).toBeInTheDocument()
		expect(propertiesLink).toHaveAttribute('href', '/properties')

		// Click should navigate
		await user.click(propertiesLink)
	})

	it('current page breadcrumb is not clickable', () => {
		vi.mocked(usePathname).mockReturnValue('/properties/123/units')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Current page "units" should not be a link
		const currentPage = screen.getByText('Units')
		expect(currentPage).toBeInTheDocument()
		expect(currentPage.tagName).not.toBe('A')
	})

	it('updates breadcrumbs when route changes', () => {
		const { rerender } = render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Start on dashboard
		vi.mocked(usePathname).mockReturnValue('/dashboard')
		rerender(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)
		expect(screen.getByText('Dashboard')).toBeInTheDocument()

		// Navigate to properties
		vi.mocked(usePathname).mockReturnValue('/properties')
		rerender(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)
		expect(screen.getByText('Properties')).toBeInTheDocument()
	})

	it('handles special routes with proper labels', () => {
		vi.mocked(usePathname).mockReturnValue('/analytics/financial')

		render(
			<TestWrapper>
				<OwnerDashboardLayoutClient>
					<div>Test Content</div>
				</OwnerDashboardLayoutClient>
			</TestWrapper>
		)

		// Should show "Analytics" and "Financial" (not "financial")
		expect(screen.getByText('Analytics')).toBeInTheDocument()
		expect(screen.getByText('Financial')).toBeInTheDocument()
	})
})
