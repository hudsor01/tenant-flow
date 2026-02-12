/**
 * TenantShell Component Tests
 *
 * Tests the tenant portal shell component including:
 * - Mobile bottom navigation
 * - Sidebar behavior
 * - User profile display
 * - Breadcrumb rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenantShell } from '../tenant-shell'

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue('/tenant')
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
	email: 'tenant@example.com',
	user_metadata: {
		full_name: 'John Doe'
	}
}
const mockSignOutMutation = { mutate: vi.fn() }

vi.mock('#hooks/api/use-auth', () => ({
	useSupabaseUser: () => ({ data: mockUser }),
	useSignOutMutation: () => mockSignOutMutation
}))

// Mock TenantNav component
vi.mock('../tenant-nav', () => ({
	TenantNav: ({ onNavigate }: { onNavigate: () => void }) => (
		<nav data-testid="tenant-nav">
			<button onClick={onNavigate} type="button">
				Mock Nav Item
			</button>
		</nav>
	)
}))

describe('TenantShell', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPathname.mockReturnValue('/tenant')
	})

	describe('basic rendering', () => {
		it('should render children content', () => {
			render(
				<TenantShell>
					<div data-testid="child-content">Child Content</div>
				</TenantShell>
			)

			expect(screen.getByTestId('child-content')).toBeInTheDocument()
		})

		it('should render TenantFlow logo', () => {
			render(<TenantShell>Content</TenantShell>)

			expect(screen.getByText('TenantFlow')).toBeInTheDocument()
		})

		it('should render TenantNav component', () => {
			render(<TenantShell>Content</TenantShell>)

			expect(screen.getByTestId('tenant-nav')).toBeInTheDocument()
		})
	})

	describe('mobile bottom navigation', () => {
		it('should render mobile nav with Home link', () => {
			const { container } = render(<TenantShell>Content</TenantShell>)

			// Find the fixed bottom navigation by its class
			const mobileNav = container.querySelector('nav.fixed.bottom-0')
			expect(mobileNav).toBeInTheDocument()
			expect(within(mobileNav as HTMLElement).getByRole('link', { name: /home/i })).toHaveAttribute(
				'href',
				'/tenant'
			)
		})

		it('should render mobile nav with Payments link', () => {
			const { container } = render(<TenantShell>Content</TenantShell>)

			const mobileNav = container.querySelector('nav.fixed.bottom-0')
			expect(within(mobileNav as HTMLElement).getByRole('link', { name: /payments/i })).toHaveAttribute(
				'href',
				'/tenant/payments'
			)
		})

		it('should render mobile nav with Maintenance link', () => {
			const { container } = render(<TenantShell>Content</TenantShell>)

			const mobileNav = container.querySelector('nav.fixed.bottom-0')
			expect(
				within(mobileNav as HTMLElement).getByRole('link', { name: /maintenance/i })
			).toHaveAttribute('href', '/tenant/maintenance')
		})

		it('should render mobile nav with Settings link', () => {
			const { container } = render(<TenantShell>Content</TenantShell>)

			const mobileNav = container.querySelector('nav.fixed.bottom-0')
			expect(within(mobileNav as HTMLElement).getByRole('link', { name: /settings/i })).toHaveAttribute(
				'href',
				'/tenant/settings'
			)
		})

		it('should highlight active mobile nav item', () => {
			mockPathname.mockReturnValue('/tenant/payments')
			const { container } = render(<TenantShell>Content</TenantShell>)

			const mobileNav = container.querySelector('nav.fixed.bottom-0')
			const paymentsLink = within(mobileNav as HTMLElement).getByRole('link', { name: /payments/i })
			expect(paymentsLink.className).toContain('text-primary')
		})

		it('should show back button on sub-pages', () => {
			mockPathname.mockReturnValue('/tenant/payments/history')
			render(<TenantShell>Content</TenantShell>)

			expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
		})

		it('should not show back button on main tenant page', () => {
			mockPathname.mockReturnValue('/tenant')
			render(<TenantShell>Content</TenantShell>)

			expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
		})

		it('should call router.back when back button is clicked', async () => {
			mockPathname.mockReturnValue('/tenant/payments/history')
			const user = userEvent.setup()
			render(<TenantShell>Content</TenantShell>)

			const backButton = screen.getByRole('button', { name: /back/i })
			await user.click(backButton)

			expect(mockRouter.back).toHaveBeenCalledTimes(1)
		})
	})

	describe('sidebar behavior', () => {
		it('should toggle sidebar when mobile menu button is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<TenantShell>Content</TenantShell>)

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
			const { container } = render(<TenantShell>Content</TenantShell>)

			// Open sidebar first using the menu button
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			await user.click(menuButton as HTMLElement)

			// Find close button (X icon) in the sidebar by its class
			const closeButton = container.querySelector('button.ml-auto.lg\\:hidden')
			expect(closeButton).toBeInTheDocument()
			await user.click(closeButton as HTMLElement)

			// Sidebar should be hidden again
			const sidebar = screen.getByRole('complementary')
			expect(sidebar.className).toContain('-translate-x-full')
		})

		it('should close sidebar when overlay is clicked', async () => {
			const user = userEvent.setup()
			const { container } = render(<TenantShell>Content</TenantShell>)

			// Open sidebar first using the menu button
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			expect(menuButton).toBeInTheDocument()
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
			const { container } = render(<TenantShell>Content</TenantShell>)

			// Open sidebar using the menu button
			const menuButton = container.querySelector('button.p-2.rounded-md.hover\\:bg-muted.lg\\:hidden')
			expect(menuButton).toBeInTheDocument()
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
			render(<TenantShell>Content</TenantShell>)

			// "John Doe" -> "JD"
			expect(screen.getByText('JD')).toBeInTheDocument()
		})

		it('should display user name in dropdown', async () => {
			const user = userEvent.setup()
			render(<TenantShell>Content</TenantShell>)

			const avatarButton = screen.getByRole('button', { name: /user menu/i })
			await user.click(avatarButton)

			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})

		it('should display user email in dropdown', async () => {
			const user = userEvent.setup()
			render(<TenantShell>Content</TenantShell>)

			const avatarButton = screen.getByRole('button', { name: /user menu/i })
			await user.click(avatarButton)

			expect(screen.getByText('tenant@example.com')).toBeInTheDocument()
		})

		it('should show dropdown menu on profile button click', async () => {
			const user = userEvent.setup()
			const { container } = render(<TenantShell>Content</TenantShell>)

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
			const { container } = render(<TenantShell>Content</TenantShell>)

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
			render(<TenantShell>Content</TenantShell>)

			const notificationsLink = screen.getByRole('link', { name: '' })
			expect(notificationsLink).toHaveAttribute(
				'href',
				'/tenant/settings?tab=notifications'
			)
		})
	})

	describe('breadcrumbs', () => {
		it('should render breadcrumbs for nested paths', () => {
			mockPathname.mockReturnValue('/tenant/payments/history')
			const { container } = render(<TenantShell>Content</TenantShell>)

			// Breadcrumbs are hidden on mobile (hidden sm:flex), but still in DOM
			const breadcrumbNav = container.querySelector('nav.hidden.sm\\:flex')
			expect(breadcrumbNav).toBeInTheDocument()

			// Check for breadcrumb labels within the breadcrumb nav
			expect(within(breadcrumbNav as HTMLElement).getByText('Tenant Portal')).toBeInTheDocument()
			expect(within(breadcrumbNav as HTMLElement).getByText('Payments')).toBeInTheDocument()
		})
	})
})
