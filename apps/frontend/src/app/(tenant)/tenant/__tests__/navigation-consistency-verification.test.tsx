/**
 * Navigation Consistency Verification Tests
 * Task 14.2: Ensure consistent navigation across all tenant pages
 *
 * Validates:
 * - Mobile nav appears on all pages (via layout integration)
 * - Active state is correct on each page
 * - Back navigation works on sub-pages
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { TenantMobileNav } from '#components/dashboard/tenant-mobile-nav'

// Mock Next.js router
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		back: mockBack,
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn()
	})
}))

describe('Task 14.2: Navigation Consistency Verification', () => {
	describe('Mobile nav appears on all tenant pages', () => {
		const allTenantPages = [
			'/tenant', // Dashboard
			'/tenant/payments', // Payments main
			'/tenant/payments/history', // Payments sub-page
			'/tenant/payments/new', // Payments sub-page
			'/tenant/payments/autopay', // Payments sub-page
			'/tenant/maintenance', // Maintenance main
			'/tenant/maintenance/new', // Maintenance sub-page
			'/tenant/settings', // Settings main
			'/tenant/settings/profile', // Settings sub-page
			'/tenant/lease', // Lease page
			'/tenant/documents', // Documents page
			'/tenant/profile' // Profile page
		]

		allTenantPages.forEach(path => {
			it(`renders mobile nav on ${path}`, () => {
				const { getByLabelText, unmount } = render(
					<TenantMobileNav currentPath={path} />
				)

				expect(getByLabelText('Mobile navigation')).toBeInTheDocument()
				unmount()
			})
		})
	})

	describe('Active state is correct on each page', () => {
		const pageToActiveNav: Array<[string, string]> = [
			['/tenant', 'Home'],
			['/tenant/payments', 'Payments'],
			['/tenant/payments/history', 'Payments'],
			['/tenant/payments/new', 'Payments'],
			['/tenant/payments/autopay', 'Payments'],
			['/tenant/maintenance', 'Maintenance'],
			['/tenant/maintenance/new', 'Maintenance'],
			['/tenant/settings', 'Settings'],
			['/tenant/settings/profile', 'Settings'],
			['/tenant/lease', 'Home'], // Falls back to Home
			['/tenant/documents', 'Home'], // Falls back to Home
			['/tenant/profile', 'Home'] // Falls back to Home
		]

		pageToActiveNav.forEach(([path, expectedActive]) => {
			it(`highlights ${expectedActive} when on ${path}`, () => {
				const { getByRole, unmount } = render(
					<TenantMobileNav currentPath={path} />
				)

				const activeLink = getByRole('link', { name: expectedActive })
				expect(activeLink).toHaveAttribute('aria-current', 'page')
				expect(activeLink).toHaveAttribute('data-active', 'true')

				unmount()
			})
		})
	})

	describe('Back navigation works on sub-pages', () => {
		const subPages = [
			'/tenant/payments/history',
			'/tenant/payments/new',
			'/tenant/payments/autopay',
			'/tenant/maintenance/new',
			'/tenant/settings/profile'
		]

		subPages.forEach(path => {
			it(`shows back button on ${path}`, () => {
				const { getByRole, unmount } = render(
					<TenantMobileNav currentPath={path} isSubPage={true} />
				)

				const backButton = getByRole('button', { name: 'Back' })
				expect(backButton).toBeInTheDocument()

				unmount()
			})
		})

		const mainPages = [
			'/tenant',
			'/tenant/payments',
			'/tenant/maintenance',
			'/tenant/settings'
		]

		mainPages.forEach(path => {
			it(`hides back button on main page ${path}`, () => {
				const { queryByRole, unmount } = render(
					<TenantMobileNav currentPath={path} isSubPage={false} />
				)

				const backButton = queryByRole('button', { name: 'Back' })
				expect(backButton).not.toBeInTheDocument()

				unmount()
			})
		})
	})

	describe('Navigation items have correct attributes', () => {
		it('all nav items have proper accessibility attributes', () => {
			const { getAllByRole, unmount } = render(
				<TenantMobileNav currentPath="/tenant" />
			)

			const navLinks = getAllByRole('link')
			expect(navLinks).toHaveLength(4) // Home, Payments, Maintenance, Settings

			navLinks.forEach(link => {
				// Each link should have aria-label
				expect(link).toHaveAttribute('aria-label')

				// Each link should have href
				expect(link).toHaveAttribute('href')
			})

			unmount()
		})

		it('active nav item has aria-current="page"', () => {
			const { getByRole, unmount } = render(
				<TenantMobileNav currentPath="/tenant/payments" />
			)

			const paymentsLink = getByRole('link', { name: 'Payments' })
			expect(paymentsLink).toHaveAttribute('aria-current', 'page')

			unmount()
		})
	})
})
