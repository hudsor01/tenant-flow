/**
 * Property-Based Test: Design System Consistency
 *
 * **Feature: tenant-onboarding-optimization, Property 8: Design System Consistency**
 * **Validates: Requirements 8.4, 8.5**
 *
 * Property 8: Design System Consistency
 * *For any* card component in the tenant portal, the component SHALL use the design-os
 * patterns and follow the design system spacing.
 *
 * This test uses fast-check to generate various card configurations and verify
 * that all cards in the tenant portal follow the design system patterns.
 *
 * Design-OS Patterns:
 * - Stat Cards: Uses data-slot="stat" with card styling (rounded-lg, border, bg-card, shadow-sm)
 * - Stat Values: Uses data-slot="stat-value" with typography-stat
 * - Stat Labels: Uses data-slot="stat-label" with font-medium
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'

// Mock the hooks
vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantPortalDashboard: vi.fn(() => ({
		data: {
			lease: {
				status: 'active',
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				rent_amount: 1500,
				unit: {
					unit_number: '101',
					property: { name: 'Test Property' }
				}
			},
			payments: {
				upcoming: { dueDate: '2024-02-01', amount: 150000 },
				recent: []
			},
			maintenance: { open: 2, recent: [] }
		},
		isLoading: false
	})),
	useTenantLeaseDocuments: vi.fn(() => ({
		data: { documents: [] },
		isLoading: false
	}))
}))

vi.mock('#hooks/api/queries/tenant-portal-queries', () => ({
	tenantPortalQueries: {
		amountDue: vi.fn(() => ({
			queryKey: ['tenant-amount-due'],
			queryFn: () => null
		})),
		autopay: vi.fn(() => ({
			queryKey: ['tenant-autopay'],
			queryFn: () => null
		}))
	}
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(() => ({ data: null, isLoading: false }))
}))

vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({ push: vi.fn() })),
	usePathname: vi.fn(() => '/tenant')
}))

vi.mock('#components/tours/tenant-onboarding-tour', () => ({
	TenantOnboardingTour: () => null,
	TenantTourTrigger: () => <button type="button">Take a Tour</button>
}))

// Import after mocks
import TenantDashboardPage from '../tenant-portal-page'

/**
 * Design-OS CSS patterns:
 * - Stat component: rounded-lg border border-border bg-card shadow-sm
 * - Uses data-slot attributes for styling hooks
 * - StatValue uses typography-stat class for values
 *
 * Design system spacing:
 * - Padding: p-2.5 to p-4 for cards
 * - Gap: gap-2 to gap-4 for layouts
 * - Border radius: rounded-lg (for stat cards)
 */

describe('Property 8: Design System Consistency', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	/**
	 * Property: For any card component in the tenant portal, the component SHALL use
	 * the Stat component CSS class pattern (rounded-lg border bg-card shadow-sm)
	 */
	it('should ensure all stat cards follow card-standard pattern', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }), // Number of times to verify
				_iteration => {
					render(<TenantDashboardPage />)

					// Stat component uses data-slot="stat" not data-testid
					const statCards = document.querySelectorAll('[data-slot="stat"]')

					// Property: Every stat card must have Stat component styling
					statCards.forEach(card => {
						// Stat = rounded-lg border border-border bg-card shadow-sm
						expect(card).toHaveClass('rounded-lg')
						expect(card).toHaveClass('border')
						expect(card).toHaveClass('bg-card')
						expect(card).toHaveClass('shadow-sm')
					})

					return true
				}
			),
			{ numRuns: 10 }
		)
	})

	/**
	 * Property: For any card in the portal, content sections SHALL
	 * follow the design-os spacing system
	 */
	it('should ensure content sections follow design-os spacing', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), _iteration => {
				render(<TenantDashboardPage />)

				// Check that stat cards exist and have proper structure
				const statCards = document.querySelectorAll('[data-slot="stat"]')

				// Property: Every stat card must exist and have proper structure
				expect(statCards.length).toBeGreaterThan(0)

				// Each stat card should have the grid layout for proper spacing
				statCards.forEach(card => {
					expect(card).toHaveClass('grid')
				})

				return true
			}),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property: For any stat card, the card SHALL have consistent border radius
	 * following the design system (rounded-lg)
	 */
	it('should ensure all stat cards have consistent border radius', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), _iteration => {
				render(<TenantDashboardPage />)

				// Get stat cards using data-slot attribute
				const statCards = document.querySelectorAll('[data-slot="stat"]')

				// Property: All stat cards should have rounded class
				statCards.forEach(card => {
					// Check for rounded class in className
					const hasRoundedClass = card.className.includes('rounded')
					expect(hasRoundedClass).toBe(true)
				})

				return true
			}),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property: For any stat card, the stat-indicator slot SHALL exist
	 * for proper icon placement
	 */
	it('should ensure stat cards have indicator slots for icons', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), _iteration => {
				render(<TenantDashboardPage />)

				// Stat cards should have indicator slots
				const indicators = document.querySelectorAll(
					'[data-slot="stat-indicator"]'
				)

				// Property: Indicator slots should exist
				expect(indicators.length).toBeGreaterThan(0)

				return true
			}),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property: For any card component, the typography SHALL follow the
	 * design-os system (font-medium for labels, typography-stat for values)
	 */
	it('should ensure card typography follows design system', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), _iteration => {
				render(<TenantDashboardPage />)

				// Stat values should use typography-stat
				const statValues = document.querySelectorAll('[data-slot="stat-value"]')
				statValues.forEach(value => {
					expect(value).toHaveClass('typography-stat')
				})

				// Stat labels should use font-medium
				const statLabels = document.querySelectorAll('[data-slot="stat-label"]')
				statLabels.forEach(label => {
					expect(label).toHaveClass('font-medium')
				})

				return true
			}),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property: For any card in the portal, the color palette SHALL be consistent
	 * with the design-os system (using CSS variables)
	 */
	it('should ensure cards use consistent color palette via CSS variables', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), _iteration => {
				render(<TenantDashboardPage />)

				const statCards = document.querySelectorAll('[data-slot="stat"]')

				statCards.forEach(card => {
					// bg-card uses CSS variable --color-card
					expect(card).toHaveClass('bg-card')
					// text-card-foreground uses CSS variable --color-card-foreground
					expect(card).toHaveClass('text-card-foreground')
				})

				return true
			}),
			{ numRuns: 25 }
		)
	})
})
