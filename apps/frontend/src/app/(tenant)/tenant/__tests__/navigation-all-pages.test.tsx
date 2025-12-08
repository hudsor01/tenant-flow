/**
 * Navigation Consistency Across All Tenant Pages
 * Task 14.2: Ensure consistent navigation across all tenant pages
 *
 * Validates Requirements 6.1, 6.2, 6.3:
 * - Mobile nav appears on all pages
 * - Active state is correct on each page
 * - Back navigation works on sub-pages
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TenantMobileNav } from '#components/dashboard/tenant-mobile-nav'

// Mock Next.js router
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		back: vi.fn(),
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn()
	})
}))

describe('Navigation Consistency Across All Tenant Pages', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Requirement 6.1: Mobile nav appears on all pages', () => {
		const allTenantPages = [
			// Main pages
			'/tenant',
			'/tenant/payments',
			'/tenant/maintenance',
			'/tenant/settings',
			// Sub-pages
			'/tenant/payments/history',
			'/tenant/payments/autopay',
			'/tenant/maintenance/request/123',
			'/tenant/maintenance/new',
			'/tenant/settings/profile',
			'/tenant/settings/notifications',
			// Other tenant pages
			'/tenant/lease',
			'/tenant/documents',
			'/tenant/profile',
			'/tenant/onboarding'
		]

		allTenantPages.forEach(path => {
			it(`should render mobile nav on ${path}`, () => {
				render(<TenantMobileNav currentPath={path} />)

				const nav = screen.getByRole('navigation', {
					name: /mobile navigation/i
				})
				expect(nav).toBeInTheDocument()
			})
		})
	})

	describe('Requirement 6.3: Active state is correct on each page', () => {
		const pathToActiveItem: Array<[string, string]> = [
			['/tenant', 'Home'],
			['/tenant/payments', 'Payments'],
			['/tenant/payments/history', 'Payments'],
			['/tenant/payments/autopay', 'Payments'],
			['/tenant/maintenance', 'Maintenance'],
			['/tenant/maintenance/request/123', 'Maintenance'],
			['/tenant/maintenance/new', 'Maintenance'],
			['/tenant/settings', 'Settings'],
			['/tenant/settings/profile', 'Settings'],
			['/tenant/settings/notifications', 'Settings'],
			// Pages that should fall back to Home
			['/tenant/lease', 'Home'],
			['/tenant/documents', 'Home'],
			['/tenant/profile', 'Home'],
			['/tenant/onboarding', 'Home']
		]

		pathToActiveItem.forEach(([path, expectedActiveItem]) => {
			it(`should highlight ${expectedActiveItem} when on ${path}`, () => {
				render(<TenantMobileNav currentPath={path} />)

				const activeLink = screen.getByRole('link', {
					name: expectedActiveItem
				})
				expect(activeLink).toHaveAttribute('aria-current', 'page')
				expect(activeLink).toHaveAttribute('data-active', 'true')
			})
		})
	})

	describe('Requirement 6.2: Back navigation works on sub-pages', () => {
		const subPages = [
			'/tenant/payments/history',
			'/tenant/payments/autopay',
			'/tenant/maintenance/request/123',
			'/tenant/maintenance/new',
			'/tenant/settings/profile',
			'/tenant/settings/notifications'
		]

		subPages.forEach(path => {
			it(`should show back button on ${path} when isSubPage is true`, () => {
				render(<TenantMobileNav currentPath={path} isSubPage />)

				const backButton = screen.getByRole('button', { name: /back/i })
				expect(backButton).toBeInTheDocument()
			})
		})

		const mainPages = [
			'/tenant',
			'/tenant/payments',
			'/tenant/maintenance',
			'/tenant/settings'
		]

		mainPages.forEach(path => {
			it(`should not show back button on ${path}`, () => {
				render(<TenantMobileNav currentPath={path} />)

				const backButton = screen.queryByRole('button', { name: /back/i })
				expect(backButton).not.toBeInTheDocument()
			})
		})
	})

	describe('Navigation items are always present', () => {
		it('should always render Home, Payments, Maintenance, and Settings nav items', () => {
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

		it('should render all nav items with correct hrefs', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const homeLink = screen.getByRole('link', { name: /home/i })
			const paymentsLink = screen.getByRole('link', { name: /payments/i })
			const maintenanceLink = screen.getByRole('link', { name: /maintenance/i })
			const settingsLink = screen.getByRole('link', { name: /settings/i })

			expect(homeLink).toHaveAttribute('href', '/tenant')
			expect(paymentsLink).toHaveAttribute('href', '/tenant/payments')
			expect(maintenanceLink).toHaveAttribute('href', '/tenant/maintenance')
			expect(settingsLink).toHaveAttribute('href', '/tenant/settings')
		})
	})

	describe('Touch target compliance', () => {
		it('should have minimum 44px touch targets for all nav items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const navItems = screen.getAllByRole('link')
			navItems.forEach(item => {
				expect(item).toHaveClass('min-h-11') // 44px minimum height
				expect(item).toHaveClass('min-w-11') // 44px minimum width
			})
		})

		it('should have minimum 44px touch target for back button', () => {
			render(
				<TenantMobileNav currentPath="/tenant/payments/history" isSubPage />
			)

			const backButton = screen.getByRole('button', { name: /back/i })
			expect(backButton).toHaveClass('min-h-11')
			expect(backButton).toHaveClass('min-w-11')
		})
	})
})
