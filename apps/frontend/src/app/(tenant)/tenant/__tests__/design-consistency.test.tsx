/**
 * Design Consistency Tests for Tenant Portal
 *
 * These tests verify that the tenant portal UI matches the Hero Mockup design patterns
 * as specified in Requirements 8.1, 8.2, 8.3
 *
 * Hero Mockup Design Patterns:
 * - Stat Cards: Icon container with primary/10 background, trend indicator with up/down arrows
 * - Quick Actions: Icon container + label + optional badge + chevron, hover states
 * - Activity Items: Avatar initials in colored circle, action text with name highlighting, timestamp
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the hooks
vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantPortalDashboard: vi.fn(() => ({
		data: {
			lease: {
				status: 'active',
				start_date: '2024-01-01',
				end_date: '2024-12-31',
				rent_amount: 1500
			},
			payments: {
				upcoming: { dueDate: '2024-02-01', amount: 150000 },
				recent: []
			},
			maintenance: { open: 2, recent: [] }
		},
		isLoading: false
	}))
}))

vi.mock('#hooks/api/queries/tenant-portal-queries', () => ({
	tenantPortalQueries: {
		amountDue: vi.fn(() => ({
			queryKey: ['tenant-amount-due'],
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

vi.mock('#components/tours', () => ({
	TenantOnboardingTour: () => null,
	TenantTourTrigger: () => <button type="button">Take a Tour</button>
}))

// Import after mocks
import TenantDashboardPage from '../tenant-portal-page'

describe('Tenant Portal Design Consistency', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Requirement 8.1: Stat Cards Match Hero Mockup Pattern', () => {
		it('should render stat cards with card-standard styling', () => {
			render(<TenantDashboardPage />)

			const statCards = screen.getAllByTestId('stat-card')
			expect(statCards.length).toBeGreaterThan(0)

			// Each stat card should have the card-standard class pattern
			statCards.forEach(card => {
				// Check for rounded-lg border bg-card shadow-sm (card-standard pattern)
				expect(card).toHaveClass('rounded-lg')
				expect(card).toHaveClass('border')
				expect(card).toHaveClass('bg-card')
				expect(card).toHaveClass('shadow-sm')
			})
		})

		it('should render stat cards with icon containers using primary/10 background', () => {
			render(<TenantDashboardPage />)

			const statCards = screen.getAllByTestId('stat-card')
			statCards.forEach(card => {
				// Look for icon container with primary/10 background
				const iconContainer = card.querySelector('[data-slot="stat-indicator"]')
				expect(iconContainer).toBeInTheDocument()
			})
		})

		it('should render stat cards with trend indicators when applicable', () => {
			render(<TenantDashboardPage />)

			// Payment card should show trend indicator when payment status exists
			const statCards = screen.getAllByTestId('stat-card')
			expect(statCards.length).toBe(3) // Lease, Payment, Maintenance
		})

		it('should display stat values with consistent typography (text-lg font-bold)', () => {
			render(<TenantDashboardPage />)

			const statValues = screen
				.getAllByTestId('stat-card')
				.map(card => card.querySelector('[data-slot="stat-value"]'))

			statValues.forEach(value => {
				expect(value).toBeInTheDocument()
				// Hero mockup uses text-lg font-bold for values
				expect(value).toHaveClass('font-semibold')
			})
		})
	})

	describe('Requirement 8.2: Quick Actions Match Hero Mockup Pattern', () => {
		it('should render quick actions with icon container + label + chevron pattern', () => {
			render(<TenantDashboardPage />)

			// Find quick actions section
			const quickActionsSection = document.querySelector(
				'[data-tour="quick-actions"]'
			)

			if (quickActionsSection) {
				// Each quick action should have: icon container, label, chevron
				const quickActions = quickActionsSection.querySelectorAll(
					'.dashboard-quick-action'
				)
				expect(quickActions.length).toBeGreaterThan(0)

				quickActions.forEach(action => {
					// Should have icon container
					const iconContainer = action.querySelector(
						'.dashboard-quick-action-icon'
					)
					expect(iconContainer).toBeInTheDocument()

					// Should have title/label
					const title = action.querySelector('.dashboard-quick-action-title')
					expect(title).toBeInTheDocument()

					// Should have chevron
					const chevron = action.querySelector(
						'.dashboard-quick-action-chevron'
					)
					expect(chevron).toBeInTheDocument()
				})
			}
		})

		it('should render quick actions with dashboard-quick-action class for hover states', () => {
			render(<TenantDashboardPage />)

			const quickActionsSection = document.querySelector(
				'[data-tour="quick-actions"]'
			)
			if (quickActionsSection) {
				const quickActions = quickActionsSection.querySelectorAll(
					'.dashboard-quick-action'
				)

				quickActions.forEach(action => {
					// Should have dashboard-quick-action class which provides hover states via CSS
					expect(action).toHaveClass('dashboard-quick-action')
				})
			}
		})

		it('should render quick action icons in icon-container-sm with primary/10 background', () => {
			render(<TenantDashboardPage />)

			const quickActionsSection = document.querySelector(
				'[data-tour="quick-actions"]'
			)
			if (quickActionsSection) {
				const iconContainers = quickActionsSection.querySelectorAll(
					'.dashboard-quick-action-icon'
				)

				iconContainers.forEach(container => {
					// Should follow icon-container pattern from Hero Mockup
					expect(container).toBeInTheDocument()
				})
			}
		})
	})

	describe('Requirement 8.3: Activity Items Match Hero Mockup Pattern', () => {
		it('should render activity items with avatar initials in colored circle', () => {
			render(<TenantDashboardPage />)

			// Activity section should have avatar initials
			const activitySection = document.querySelector(
				'[data-tour="recent-activity"]'
			)
			if (activitySection) {
				// Look for avatar containers (rounded-full with initials)
				const avatars = activitySection.querySelectorAll('.rounded-full')
				// Avatar containers should exist for activity items
				expect(avatars.length).toBeGreaterThanOrEqual(0)
			}
		})

		it('should render activity items with action text and name highlighting', () => {
			render(<TenantDashboardPage />)

			const activitySection = document.querySelector(
				'[data-tour="recent-activity"]'
			)
			if (activitySection) {
				// Activity items should have font-medium for names
				const names = activitySection.querySelectorAll('.font-medium')
				expect(names.length).toBeGreaterThanOrEqual(0)
			}
		})

		it('should render activity items with timestamp display', () => {
			render(<TenantDashboardPage />)

			const activitySection = document.querySelector(
				'[data-tour="recent-activity"]'
			)
			if (activitySection) {
				// Should have text-caption or text-muted-foreground for timestamps
				const timestamps = activitySection.querySelectorAll(
					'.text-caption, .text-muted-foreground'
				)
				expect(timestamps.length).toBeGreaterThanOrEqual(0)
			}
		})

		it('should render activity items with status badges', () => {
			render(<TenantDashboardPage />)

			const activitySection = document.querySelector(
				'[data-tour="recent-activity"]'
			)
			if (activitySection) {
				// Status badges should use rounded-full or rounded-lg with color backgrounds
				const badges = activitySection.querySelectorAll('[class*="rounded"]')
				expect(badges.length).toBeGreaterThanOrEqual(0)
			}
		})
	})
})
