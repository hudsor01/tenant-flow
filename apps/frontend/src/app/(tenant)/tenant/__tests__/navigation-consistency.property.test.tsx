/**
 * Property 6: Navigation Consistency
 * Validates Requirements 6.1, 6.2, 6.3
 *
 * For any tenant route:
 * - Mobile nav is present
 * - Active item matches the current path
 * - Sub-pages expose a back button
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TenantMobileNav } from '#components/dashboard/tenant-mobile-nav'
import * as fc from 'fast-check'

// Mock Next.js router
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		back: vi.fn(),
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn()
	})
}))

describe('Property 6: Navigation Consistency', () => {
	afterEach(() => {
		cleanup()
	})

	/**
	 * **Feature: tenant-onboarding-optimization, Property 6: Navigation Consistency**
	 * For any page in the tenant portal on mobile, the navigation component SHALL be present
	 * and the current route SHALL be visually highlighted.
	 */
	describe('Property-Based Tests (fast-check)', () => {
		it('Property 6.1: Mobile nav is always present for any tenant path', () => {
			// Generate arbitrary tenant paths
			const tenantPathArbitrary = fc.oneof(
				fc.constant('/tenant'),
				fc.constantFrom(
					'/tenant/payments',
					'/tenant/maintenance',
					'/tenant/settings'
				),
				fc
					.tuple(
						fc.constantFrom('payments', 'maintenance', 'settings', 'lease'),
						fc.array(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), {
							minLength: 1,
							maxLength: 10
						})
					)
					.map(([section, chars]) => `/tenant/${section}/${chars.join('')}`)
			)

			fc.assert(
				fc.property(tenantPathArbitrary, path => {
					const { getByLabelText, unmount } = render(
						<TenantMobileNav currentPath={path} />
					)

					// Mobile navigation MUST be present
					const nav = getByLabelText('Mobile navigation')
					expect(nav).toBeInTheDocument()

					unmount()
				}),
				{ numRuns: 50 }
			)
		})

		it('Property 6.2: Back button appears when isSubPage is true', () => {
			// Generate arbitrary tenant paths and isSubPage boolean
			const pathAndSubPageArbitrary = fc.tuple(
				fc.constantFrom(
					'/tenant/payments/history',
					'/tenant/maintenance/request/123',
					'/tenant/settings/profile',
					'/tenant/lease/details'
				),
				fc.boolean()
			)

			fc.assert(
				fc.property(pathAndSubPageArbitrary, ([path, isSubPage]) => {
					const { queryByRole, unmount } = render(
						<TenantMobileNav currentPath={path} isSubPage={isSubPage} />
					)

					const backButton = queryByRole('button', { name: 'Back' })

					if (isSubPage) {
						// Back button MUST be present when isSubPage is true
						expect(backButton).toBeInTheDocument()
					} else {
						// Back button MUST NOT be present when isSubPage is false
						expect(backButton).not.toBeInTheDocument()
					}

					unmount()
				}),
				{ numRuns: 50 }
			)
		})

		it('Property 6.3: Active route is always visually highlighted', () => {
			// Generate paths that should match specific nav items
			const pathToExpectedActiveItem: Array<[string, string]> = [
				['/tenant', 'Home'],
				['/tenant/payments', 'Payments'],
				['/tenant/payments/history', 'Payments'],
				['/tenant/payments/autopay', 'Payments'],
				['/tenant/maintenance', 'Maintenance'],
				['/tenant/maintenance/request/123', 'Maintenance'],
				['/tenant/settings', 'Settings'],
				['/tenant/settings/profile', 'Settings'],
				['/tenant/lease', 'Home'], // Falls back to Home
				['/tenant/documents', 'Home'] // Falls back to Home
			]

			const pathArbitrary = fc.constantFrom(...pathToExpectedActiveItem)

			fc.assert(
				fc.property(pathArbitrary, ([path, expectedActiveItem]) => {
					const { getByRole, unmount } = render(
						<TenantMobileNav currentPath={path} />
					)

					// Find the expected active nav item
					const activeLink = getByRole('link', { name: expectedActiveItem })

					// Active link MUST have aria-current="page"
					expect(activeLink).toHaveAttribute('aria-current', 'page')

					// Active link MUST have data-active="true"
					expect(activeLink).toHaveAttribute('data-active', 'true')

					unmount()
				}),
				{ numRuns: 25 }
			)
		})
	})
})
