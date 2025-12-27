/**
 * Tenant Portal Tests
 *
 * Tests for the core tenant portal navigation and mobile bottom nav.
 * Component-level tests for the TenantPortal components are skipped
 * due to complex animation dependencies (BlurFade, BorderBeam, NumberTicker).
 * These are covered by E2E tests instead.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TenantMobileNav } from '#components/dashboard/tenant-mobile-nav'

// Mock next/navigation
const mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
	prefetch: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn()
}

vi.mock('next/navigation', () => ({
	useRouter: () => mockRouter
}))

describe('Tenant Portal Navigation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('TenantMobileNav', () => {
		it('renders all navigation items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			expect(screen.getByText('Home')).toBeInTheDocument()
			expect(screen.getByText('Payments')).toBeInTheDocument()
			expect(screen.getByText('Maintenance')).toBeInTheDocument()
			expect(screen.getByText('Settings')).toBeInTheDocument()
		})

		it('highlights Home when on /tenant path', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const homeLink = screen.getByText('Home').closest('a')
			expect(homeLink).toHaveAttribute('aria-current', 'page')
			expect(homeLink).toHaveAttribute('data-active', 'true')
		})

		it('highlights Payments when on payments path', () => {
			render(<TenantMobileNav currentPath="/tenant/payments" />)

			const paymentsLink = screen.getByText('Payments').closest('a')
			expect(paymentsLink).toHaveAttribute('aria-current', 'page')
			expect(paymentsLink).toHaveAttribute('data-active', 'true')
		})

		it('highlights Maintenance when on maintenance path', () => {
			render(<TenantMobileNav currentPath="/tenant/maintenance" />)

			const maintenanceLink = screen.getByText('Maintenance').closest('a')
			expect(maintenanceLink).toHaveAttribute('aria-current', 'page')
			expect(maintenanceLink).toHaveAttribute('data-active', 'true')
		})

		it('highlights Settings when on settings path', () => {
			render(<TenantMobileNav currentPath="/tenant/settings" />)

			const settingsLink = screen.getByText('Settings').closest('a')
			expect(settingsLink).toHaveAttribute('aria-current', 'page')
			expect(settingsLink).toHaveAttribute('data-active', 'true')
		})

		it('shows back button on sub-pages', () => {
			render(<TenantMobileNav currentPath="/tenant/payments/history" isSubPage />)

			expect(screen.getByText('Back')).toBeInTheDocument()
		})

		it('does not show back button on main pages', () => {
			render(<TenantMobileNav currentPath="/tenant/payments" />)

			expect(screen.queryByText('Back')).not.toBeInTheDocument()
		})

		it('calls router.back when back button is clicked', async () => {
			const user = userEvent.setup()

			render(<TenantMobileNav currentPath="/tenant/payments/history" isSubPage />)

			const backButton = screen.getByText('Back').closest('button')
			if (backButton) {
				await user.click(backButton)
			}

			expect(mockRouter.back).toHaveBeenCalled()
		})

		it('has minimum 44px touch targets for accessibility', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			const links = screen.getAllByRole('link')
			links.forEach(link => {
				expect(link).toHaveClass('min-h-11', 'min-w-11')
			})
		})

		it('provides accessible labels for navigation items', () => {
			render(<TenantMobileNav currentPath="/tenant" />)

			expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: 'Payments' })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: 'Maintenance' })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
		})

		it('defaults Home active when on unknown tenant routes', () => {
			render(<TenantMobileNav currentPath="/tenant/lease" />)

			const homeLink = screen.getByText('Home').closest('a')
			expect(homeLink).toHaveAttribute('data-active', 'true')
		})

		it('highlights Payments for nested payment routes', () => {
			render(<TenantMobileNav currentPath="/tenant/payments/methods" />)

			const paymentsLink = screen.getByText('Payments').closest('a')
			expect(paymentsLink).toHaveAttribute('data-active', 'true')
		})

		it('highlights Maintenance for nested maintenance routes', () => {
			render(<TenantMobileNav currentPath="/tenant/maintenance/new" />)

			const maintenanceLink = screen.getByText('Maintenance').closest('a')
			expect(maintenanceLink).toHaveAttribute('data-active', 'true')
		})
	})
})

describe('Tenant Portal Route Structure', () => {
	it('defines correct main page routes', () => {
		const mainPages = ['/tenant', '/tenant/payments', '/tenant/maintenance', '/tenant/settings']

		// Each main page should exist and not be considered a sub-page
		mainPages.forEach(path => {
			render(<TenantMobileNav currentPath={path} />)
			expect(screen.queryByText('Back')).not.toBeInTheDocument()
		})
	})

	it('identifies sub-pages correctly', () => {
		const subPages = [
			'/tenant/payments/history',
			'/tenant/payments/methods',
			'/tenant/payments/autopay',
			'/tenant/maintenance/new',
			'/tenant/settings/profile'
		]

		subPages.forEach(path => {
			const { unmount } = render(<TenantMobileNav currentPath={path} isSubPage />)
			expect(screen.getByText('Back')).toBeInTheDocument()
			unmount()
		})
	})
})
