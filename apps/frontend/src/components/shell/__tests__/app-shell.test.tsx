/**
 * AppShell Component Tests
 *
 * Tests the main application shell component including:
 * - Basic rendering
 * - Mobile sidebar behavior
 * - User profile dropdown
 * - Command palette
 * - Quick actions dock
 * - Breadcrumbs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../app-shell'

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue('/dashboard')
const mockRouter = {
	push: vi.fn(),
	back: vi.fn()
}
vi.mock('next/navigation', () => ({
	usePathname: () => mockPathname(),
	useRouter: () => mockRouter
}))

// Mock auth hooks
const mockUser = {
	id: 'test-user-id',
	email: 'owner@example.com',
	user_metadata: {
		full_name: 'Jane Smith'
	}
}
const mockSignOutMutation = { mutate: vi.fn() }

vi.mock('#hooks/api/use-auth', () => ({
	useSupabaseUser: () => ({ data: mockUser }),
	useSignOutMutation: () => mockSignOutMutation
}))

// Mock property and tenant list hooks
const mockProperties = [
	{ id: 'prop-1', name: 'Sunset Apartments', city: 'Los Angeles', state: 'CA' },
	{ id: 'prop-2', name: 'Ocean View', city: 'San Diego', state: 'CA' }
]

const mockTenants = [
	{ id: 'tenant-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
	{ id: 'tenant-2', first_name: 'Sarah', last_name: 'Wilson', email: 'sarah@example.com' }
]

vi.mock('#hooks/api/use-properties', () => ({
	usePropertyList: () => ({ data: mockProperties })
}))

vi.mock('#hooks/api/use-tenant', () => ({
	useTenantList: () => ({ data: { data: mockTenants } })
}))

// Mock MainNav component
vi.mock('../main-nav', () => ({
	MainNav: ({ onNavigate }: { onNavigate: () => void }) => (
		<nav data-testid="main-nav">
			<button onClick={onNavigate} type="button">
				Mock Nav Item
			</button>
		</nav>
	)
}))

// Mock QuickActionsDock component
vi.mock('../quick-actions-dock', () => ({
	QuickActionsDock: () => <div data-testid="quick-actions-dock">Quick Actions</div>
}))

// Mock GlobalSyncIndicator to avoid needing QueryClientProvider
vi.mock('#components/ui/global-sync-indicator', () => ({
	GlobalSyncIndicator: () => <div data-testid="global-sync-indicator">Saved</div>
}))

// Mock scrollIntoView for command palette (JSDOM doesn't support it)
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn()
})

describe('AppShell', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPathname.mockReturnValue('/dashboard')
	})

	describe('basic rendering', () => {
		it('should render children content', () => {
			render(
				<AppShell>
					<div data-testid="child-content">Child Content</div>
				</AppShell>
			)

			expect(screen.getByTestId('child-content')).toBeInTheDocument()
		})

		it('should render TenantFlow logo', () => {
			render(<AppShell>Content</AppShell>)

			expect(screen.getByText('TenantFlow')).toBeInTheDocument()
		})

		it('should render MainNav component', () => {
			render(<AppShell>Content</AppShell>)

			expect(screen.getByTestId('main-nav')).toBeInTheDocument()
		})

		it('should render search button', () => {
			render(<AppShell>Content</AppShell>)

			expect(screen.getByText('Search...')).toBeInTheDocument()
		})

		it('should render keyboard shortcut hint', () => {
			render(<AppShell>Content</AppShell>)

			expect(screen.getByText('K')).toBeInTheDocument()
		})
	})

	describe('quick actions dock', () => {
		it('should render QuickActionsDock by default', () => {
			render(<AppShell>Content</AppShell>)

			expect(screen.getByTestId('quick-actions-dock')).toBeInTheDocument()
		})

		it('should not render QuickActionsDock when showQuickActionsDock is false', () => {
			render(<AppShell showQuickActionsDock={false}>Content</AppShell>)

			expect(screen.queryByTestId('quick-actions-dock')).not.toBeInTheDocument()
		})
	})

	describe('sidebar behavior', () => {
		it('should toggle sidebar when mobile menu button is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Find the mobile menu button by its specific class
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			expect(menuButton).toBeInTheDocument()

			await user.click(menuButton as HTMLElement)

			// Sidebar should be visible (translate-x-0)
			const sidebar = screen.getByRole('complementary')
			expect(sidebar.className).toContain('translate-x-0')
		})

		it('should close sidebar when close button is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Open sidebar first using the menu button
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			await user.click(menuButton as HTMLElement)

			// Find close button (X icon) in the sidebar by its class
			const closeButton = screen.getByRole('button', { name: /close sidebar/i })
			await user.click(closeButton)

			// Sidebar should be hidden again
			const sidebar = screen.getByRole('complementary')
			expect(sidebar.className).toContain('-translate-x-full')
		})

		it('should close sidebar when overlay is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Open sidebar first
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			await user.click(menuButton as HTMLElement)

			// Click overlay
			const overlay = container.querySelector('.fixed.inset-0.z-40')
			expect(overlay).toBeInTheDocument()
			await user.click(overlay as HTMLElement)

			// Sidebar should be hidden
			const sidebar = screen.getByRole('complementary')
			expect(sidebar.className).toContain('-translate-x-full')
		})

		it('should close sidebar when nav item is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Open sidebar
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			await user.click(menuButton as HTMLElement)

			// Click nav item (mock nav has a button)
			const navButton = screen.getByRole('button', { name: 'Mock Nav Item' })
			await user.click(navButton)

			// Sidebar should be hidden
			const sidebar = screen.getByRole('complementary')
			expect(sidebar.className).toContain('-translate-x-full')
		})
	})

	describe('user profile', () => {
		it('should display user initials', () => {
			render(<AppShell>Content</AppShell>)

			// "Jane Smith" -> "JS"
			expect(screen.getByText('JS')).toBeInTheDocument()
		})

		it('should display user name in dropdown', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			const avatarButton = screen.getByRole('button', { name: /user menu/i })
			await user.click(avatarButton)

			expect(screen.getByText('Jane Smith')).toBeInTheDocument()
		})

		it('should display user email in dropdown', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			const avatarButton = screen.getByRole('button', { name: /user menu/i })
			await user.click(avatarButton)

			expect(screen.getByText('owner@example.com')).toBeInTheDocument()
		})

		it('should show dropdown menu on profile button click', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Find the dropdown trigger by its aria-haspopup attribute
			const dropdownTrigger = container.querySelector('button[aria-haspopup="menu"]')
			expect(dropdownTrigger).toBeInTheDocument()
			await user.click(dropdownTrigger as HTMLElement)

			expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
			expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
			expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
		})

		it('should call signOut when Sign out is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<AppShell>Content</AppShell>)

			// Open dropdown
			const dropdownTrigger = container.querySelector('button[aria-haspopup="menu"]')
			await user.click(dropdownTrigger as HTMLElement)

			// Click sign out
			const signOutItem = screen.getByRole('menuitem', { name: /sign out/i })
			await user.click(signOutItem)

			expect(mockSignOutMutation.mutate).toHaveBeenCalledTimes(1)
		})
	})

	describe('header', () => {
		it('should render notifications link', () => {
			const { container } = render(<AppShell>Content</AppShell>)

			// Find the link with Bell icon
			const notificationsLink = container.querySelector('a[href="/settings?tab=notifications"]')
			expect(notificationsLink).toBeInTheDocument()
		})
	})

	describe('breadcrumbs', () => {
		it('should render breadcrumbs for nested paths', () => {
			mockPathname.mockReturnValue('/properties/123')
			const { container } = render(<AppShell>Content</AppShell>)

			// Breadcrumbs are hidden on mobile (hidden sm:flex), but still in DOM
			const breadcrumbNav = container.querySelector('nav.hidden.sm\\:flex')
			expect(breadcrumbNav).toBeInTheDocument()

			// Check for breadcrumb labels within the breadcrumb nav
			// The breadcrumb utility generates "Properties > 123" for /properties/123
			expect(within(breadcrumbNav as HTMLElement).getByText('Properties')).toBeInTheDocument()
		})

		it('should render breadcrumb links for parent paths', () => {
			mockPathname.mockReturnValue('/properties/123')
			const { container } = render(<AppShell>Content</AppShell>)

			const breadcrumbNav = container.querySelector('nav.hidden.sm\\:flex')
			const propertiesLink = within(breadcrumbNav as HTMLElement).getByRole('link', {
				name: 'Properties'
			})
			expect(propertiesLink).toHaveAttribute('href', '/properties')
		})
	})

	describe('command palette', () => {
		it('should open command palette when search button is clicked', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Click the search button
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			// Command palette should be open
			expect(screen.getByPlaceholderText('Search pages and actions...')).toBeInTheDocument()
		})

		it('should show navigation groups in command palette', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Open command palette
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			// Check for group headings (some text may appear multiple times)
			expect(screen.getByText('Navigation')).toBeInTheDocument()
			expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
			// "Financials" appears in both sidebar nav and command palette - use getAllByText
			expect(screen.getAllByText('Financials').length).toBeGreaterThanOrEqual(1)
			expect(screen.getAllByText('Documents').length).toBeGreaterThanOrEqual(1)
		})

		it('should show recent properties in command palette', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Open command palette
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			expect(screen.getByText('Recent Properties')).toBeInTheDocument()
			expect(screen.getByText('Sunset Apartments')).toBeInTheDocument()
			expect(screen.getByText('Ocean View')).toBeInTheDocument()
		})

		it('should show recent tenants in command palette', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Open command palette
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			expect(screen.getByText('Recent Tenants')).toBeInTheDocument()
			expect(screen.getByText('John Doe')).toBeInTheDocument()
			expect(screen.getByText('Sarah Wilson')).toBeInTheDocument()
		})

		it('should show Account & Support section in command palette', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Open command palette
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			expect(screen.getByText('Account & Support')).toBeInTheDocument()
			expect(screen.getByText('Notifications')).toBeInTheDocument()
			expect(screen.getByText('Help & Support')).toBeInTheDocument()
		})

		it('should close command palette and navigate when item is selected', async () => {
			const user = userEvent.setup()
			render(<AppShell>Content</AppShell>)

			// Open command palette
			const searchButton = screen.getByText('Search...')
			await user.click(searchButton)

			// Click on Dashboard navigation item
			const dashboardItem = screen.getByRole('option', { name: /dashboard/i })
			await user.click(dashboardItem)

			expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
		})

		it('should open command palette with keyboard shortcut', async () => {
			render(<AppShell>Content</AppShell>)

			// Simulate Cmd+K (or Ctrl+K)
			fireEvent.keyDown(window, { key: 'k', metaKey: true })

			// Command palette should be open
			expect(screen.getByPlaceholderText('Search pages and actions...')).toBeInTheDocument()
		})

		it('should close command palette with keyboard shortcut', async () => {
			render(<AppShell>Content</AppShell>)

			// Open command palette
			fireEvent.keyDown(window, { key: 'k', metaKey: true })

			// Verify it's open
			expect(screen.getByPlaceholderText('Search pages and actions...')).toBeInTheDocument()

			// Toggle it closed
			fireEvent.keyDown(window, { key: 'k', metaKey: true })

			// Command palette should be closed
			expect(screen.queryByPlaceholderText('Search pages and actions...')).not.toBeInTheDocument()
		})
	})

	describe('sidebar tour attribute', () => {
		it('should have data-tour attribute for sidebar', () => {
			render(<AppShell>Content</AppShell>)

			const sidebar = screen.getByRole('complementary')
			expect(sidebar).toHaveAttribute('data-tour', 'sidebar-nav')
		})
	})
})
