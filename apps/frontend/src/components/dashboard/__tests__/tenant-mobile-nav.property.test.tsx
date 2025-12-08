/**
 * Property-Based Test: Mobile Touch Target Compliance
 *
 * **Feature: tenant-onboarding-optimization, Property 2: Mobile Touch Target Compliance**
 * **Validates: Requirements 2.1, 2.4**
 *
 * Property 2: Mobile Touch Target Compliance
 * *For any* interactive element in the tenant portal when viewed on mobile (viewport < 768px),
 * the element SHALL have a minimum touch target size of 44x44 pixels.
 *
 * This test uses fast-check to generate various navigation states and verify
 * that all interactive elements meet the 44px minimum touch target requirement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		back: vi.fn()
	})),
	usePathname: vi.fn(() => '/tenant')
}))

// Import after mocks
import { TenantMobileNav } from '../tenant-mobile-nav'

/**
 * Arbitrary for valid tenant portal paths
 */
const tenantPathArb = fc.constantFrom(
	'/tenant',
	'/tenant/payments',
	'/tenant/payments/history',
	'/tenant/payments/methods',
	'/tenant/payments/autopay',
	'/tenant/maintenance',
	'/tenant/maintenance/new',
	'/tenant/settings',
	'/tenant/profile',
	'/tenant/lease',
	'/tenant/documents'
)

/**
 * Arbitrary for sub-page status
 */
const isSubPageArb = fc.boolean()

describe('Property 2: Mobile Touch Target Compliance', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		cleanup()
	})

	/**
	 * Property: For any path in the tenant portal, all navigation links
	 * SHALL have minimum 44x44 pixel touch targets
	 */
	it('should ensure all nav links have 44px minimum touch targets for any path', () => {
		fc.assert(
			fc.property(tenantPathArb, path => {
				cleanup() // Clean up before each property iteration
				const { container } = render(<TenantMobileNav currentPath={path} />)

				const navLinks = container.querySelectorAll('a[role="link"], a')

				// Property: Every nav link must have 44px minimum touch target
				navLinks.forEach(link => {
					expect(link).toHaveClass('min-h-11')
					expect(link).toHaveClass('min-w-11')
				})

				return true
			}),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property: For any sub-page path, the back button SHALL have
	 * minimum 44x44 pixel touch target
	 */
	it('should ensure back button has 44px minimum touch target on sub-pages', () => {
		fc.assert(
			fc.property(tenantPathArb, isSubPageArb, (path, isSubPage) => {
				cleanup() // Clean up before each property iteration
				const { container } = render(
					<TenantMobileNav currentPath={path} isSubPage={isSubPage} />
				)

				if (isSubPage) {
					const backButton = container.querySelector(
						'button[aria-label="Back"]'
					)
					if (backButton) {
						expect(backButton).toHaveClass('min-h-11')
						expect(backButton).toHaveClass('min-w-11')
					}
				}

				return true
			}),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property: For any navigation state, all interactive elements
	 * SHALL have touch-friendly padding (minimum p-2 or equivalent)
	 */
	it('should ensure all interactive elements have adequate padding', () => {
		fc.assert(
			fc.property(tenantPathArb, path => {
				cleanup() // Clean up before each property iteration
				const { container } = render(<TenantMobileNav currentPath={path} />)

				const navLinks = container.querySelectorAll('a')

				// Property: Every nav link should have padding for touch friendliness
				navLinks.forEach(link => {
					// Check for padding classes (p-2, p-3, px-*, py-*, etc.)
					const hasPadding =
						link.className.includes('p-') ||
						link.className.includes('px-') ||
						link.className.includes('py-')
					expect(hasPadding).toBe(true)
				})

				return true
			}),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property: For any path, the navigation container SHALL be
	 * positioned at the bottom of the viewport for mobile accessibility
	 */
	it('should ensure navigation is fixed at bottom for any path', () => {
		fc.assert(
			fc.property(tenantPathArb, path => {
				cleanup() // Clean up before each property iteration
				const { container } = render(<TenantMobileNav currentPath={path} />)

				const nav = container.querySelector('nav')

				// Property: Navigation must be fixed at bottom
				expect(nav).toHaveClass('fixed')
				expect(nav).toHaveClass('bottom-0')

				return true
			}),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property: For any path, exactly one navigation item SHALL be
	 * marked as active (data-active="true")
	 */
	it('should ensure exactly one nav item is active for any path', () => {
		fc.assert(
			fc.property(tenantPathArb, path => {
				cleanup() // Clean up before each property iteration
				const { container } = render(<TenantMobileNav currentPath={path} />)

				const navLinks = container.querySelectorAll('a')
				const activeLinks = Array.from(navLinks).filter(
					link => link.getAttribute('data-active') === 'true'
				)

				// Property: Exactly one link should be active
				expect(activeLinks.length).toBe(1)

				return true
			}),
			{ numRuns: 100 }
		)
	})

	/**
	 * Property: For any path, all nav items SHALL have accessible labels
	 */
	it('should ensure all nav items have accessible labels for any path', () => {
		fc.assert(
			fc.property(tenantPathArb, path => {
				cleanup() // Clean up before each property iteration
				const { container } = render(<TenantMobileNav currentPath={path} />)

				const navLinks = container.querySelectorAll('a')

				// Property: Every nav link must have accessible name
				navLinks.forEach(link => {
					const accessibleName =
						link.getAttribute('aria-label') || link.textContent
					expect(accessibleName).toBeTruthy()
					expect(accessibleName!.length).toBeGreaterThan(0)
				})

				return true
			}),
			{ numRuns: 100 }
		)
	})
})
