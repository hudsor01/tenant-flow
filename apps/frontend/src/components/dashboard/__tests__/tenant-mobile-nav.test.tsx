/**
 * TenantMobileNav Component Tests
 *
 * Tests for the mobile navigation component in the tenant portal.
 * Following TDD approach - these tests are written first before implementation.
 *
 * Requirements:
 * - 6.1: Consistent bottom navigation bar across all views
 * - 6.2: Clear back navigation option on sub-pages
 * - 6.3: Highlight current section in navigation
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		back: vi.fn()
	})),
	usePathname: vi.fn(() => '/tenant')
}))

// Import after mocks - component doesn't exist yet, this will fail
import { TenantMobileNav } from '../tenant-mobile-nav'

describe('TenantMobileNav Component', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Requirement 6.1: Bottom Navigation Renders on Mobile', () => {
		it('should render a bottom navigation bar', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
			expect(nav).toBeInTheDocument()
		})

		it('should render Home, Payments, Maintenance, and Settings nav items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
			expect(
				screen.getByRole('link', { name: /payments/i })
			).toBeInTheDocument()
			expect(
				screen.getByRole('link', { name: /maintenance/i })
			).toBeInTheDocument()
			expect(
				screen.getByRole('link', { name: /settings/i })
			).toBeInTheDocument()
		})

		it('should render icons for each nav item', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			// Each nav item should have an icon
			const navItems = screen.getAllByRole('link')
			expect(navItems.length).toBe(4)

			navItems.forEach(item => {
				const icon = item.querySelector('svg')
				expect(icon).toBeInTheDocument()
			})
		})
	})

	describe('Requirement 6.1: 44px Minimum Touch Targets', () => {
		it('should have minimum 44px touch targets for all nav items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const navItems = screen.getAllByRole('link')

			navItems.forEach(item => {
				// Check for min-h-11 (44px) class
				expect(item).toHaveClass('min-h-11')
			})
		})

		it('should have minimum 44px width for all nav items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const navItems = screen.getAllByRole('link')

			navItems.forEach(item => {
				// Check for min-w-11 (44px) class
				expect(item).toHaveClass('min-w-11')
			})
		})
	})

	describe('Requirement 6.3: Active Route Highlighting', () => {
		it('should highlight Home when on /tenant path', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const homeLink = screen.getByRole('link', { name: /home/i })
			expect(homeLink).toHaveAttribute('data-active', 'true')
		})

		it('should highlight Payments when on /tenant/payments path', () => {
			render(<TenantMobileNav currentPath="/tenant/payments" />)

			const paymentsLink = screen.getByRole('link', { name: /payments/i })
			expect(paymentsLink).toHaveAttribute('data-active', 'true')
		})

		it('should highlight Maintenance when on /tenant/maintenance path', () => {
			render(<TenantMobileNav currentPath="/tenant/maintenance" />)

			const maintenanceLink = screen.getByRole('link', { name: /maintenance/i })
			expect(maintenanceLink).toHaveAttribute('data-active', 'true')
		})

		it('should highlight Settings when on /tenant/settings path', () => {
			render(<TenantMobileNav currentPath="/tenant/settings" />)

			const settingsLink = screen.getByRole('link', { name: /settings/i })
			expect(settingsLink).toHaveAttribute('data-active', 'true')
		})

		it('should highlight Payments for nested payment routes', () => {
			render(<TenantMobileNav currentPath="/tenant/payments/history" />)

			const paymentsLink = screen.getByRole('link', { name: /payments/i })
			expect(paymentsLink).toHaveAttribute('data-active', 'true')
		})

		it('should apply active styling class to active nav item', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const homeLink = screen.getByRole('link', { name: /home/i })
			// Active items should have text-primary class
			expect(homeLink).toHaveClass('text-primary')
		})

		it('should apply inactive styling class to inactive nav items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const paymentsLink = screen.getByRole('link', { name: /payments/i })
			// Inactive items should have text-muted-foreground class
			expect(paymentsLink).toHaveClass('text-muted-foreground')
		})
	})

	describe('Requirement 6.2: Back Navigation for Sub-pages', () => {
		it('should show back button on sub-pages', () => {
			render(
				<TenantMobileNav currentPath="/tenant/payments/history" isSubPage />
			)

			const backButton = screen.getByRole('button', { name: /back/i })
			expect(backButton).toBeInTheDocument()
		})

		it('should not show back button on main pages', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const backButton = screen.queryByRole('button', { name: /back/i })
			expect(backButton).not.toBeInTheDocument()
		})

		it('should have 44px minimum touch target for back button', () => {
			render(
				<TenantMobileNav currentPath="/tenant/payments/history" isSubPage />
			)

			const backButton = screen.getByRole('button', { name: /back/i })
			expect(backButton).toHaveClass('min-h-11')
			expect(backButton).toHaveClass('min-w-11')
		})
	})

	describe('Accessibility', () => {
		it('should have proper aria-label on navigation', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const nav = screen.getByRole('navigation')
			expect(nav).toHaveAttribute('aria-label', 'Mobile navigation')
		})

		it('should have aria-current on active link', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const homeLink = screen.getByRole('link', { name: /home/i })
			expect(homeLink).toHaveAttribute('aria-current', 'page')
		})
	})

	describe('Fixed Positioning', () => {
		it('should be fixed at the bottom of the viewport', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const nav = screen.getByRole('navigation')
			expect(nav).toHaveClass('fixed')
			expect(nav).toHaveClass('bottom-0')
			expect(nav).toHaveClass('left-0')
			expect(nav).toHaveClass('right-0')
		})

		it('should have appropriate z-index for overlay', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const nav = screen.getByRole('navigation')
			expect(nav).toHaveClass('z-50')
		})
	})
})
