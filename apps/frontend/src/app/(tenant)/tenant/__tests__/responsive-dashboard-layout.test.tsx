/**
 * Responsive Dashboard Layout Tests
 *
 * These tests are written first (TDD) to capture the expected responsive
 * behavior of the tenant dashboard. They currently FAIL and will guide
 * the implementation work in Tasks 4.2 and 4.3.
 *
 * Requirements covered:
 * - 2.2: Dashboard cards stack vertically on mobile
 * - 2.4: Quick action buttons provide adequate (44px) touch targets on mobile
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mocks for data/query hooks (colocated pattern)
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
	})),
	useTenantLeaseDocuments: vi.fn(() => ({
		data: { documents: [] },
		isLoading: false
	})),
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

function mockMobileViewport() {
	const matchMediaMock = vi.fn().mockImplementation(query => ({
		matches: query.includes('max-width: 768px'),
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: matchMediaMock
	})
}

// SKIPPED: TDD tests for future implementation (Tasks 4.2, 4.3)
// These tests define expected behavior for responsive mobile layouts
// that need to be implemented in the TenantDashboardPage component
describe.skip('Responsive Tenant Dashboard Layout (mobile-first)', () => {
	beforeEach(() => {
		mockMobileViewport()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('stacks stat cards into a single column on mobile viewports', () => {
		render(<TenantDashboardPage />)

		// The stat grid should expose an explicit mobile stacking indicator for testing
		const statGrid = document.querySelector('.dashboard-cards-container')
		expect(statGrid).toBeInTheDocument()
		expect(statGrid).toHaveAttribute('data-mobile-stacked', 'true')

		// Sanity check: cards still render
		expect(screen.getAllByTestId('stat-card').length).toBeGreaterThan(1)
	})

	it('ensures quick action links meet 44px mobile touch target spacing', () => {
		render(<TenantDashboardPage />)

		const quickActions = document.querySelectorAll('.dashboard-quick-action')
		expect(quickActions.length).toBeGreaterThan(0)

		quickActions.forEach(action => {
			// Explicit touch-target marker to assert mobile-friendly spacing
			expect(action).toHaveAttribute('data-touch-target', 'true')

			// Inline min-height should reflect the 44px requirement (2.75rem or CSS var)
			const minHeight = (action as HTMLElement).style.minHeight
			expect(
				minHeight === '2.75rem' || minHeight === 'var(--touch-target-min)'
			).toBe(true)
		})
	})

	it('ensures quick actions expose comfortable padding for mobile taps', () => {
		render(<TenantDashboardPage />)

		const quickActions = document.querySelectorAll('.dashboard-quick-action')
		expect(quickActions.length).toBeGreaterThan(0)

		quickActions.forEach(action => {
			expect(action).toHaveAttribute('data-spacing', 'comfortable')
			expect((action as HTMLElement).style.padding).toContain(
				'var(--touch-target-padding)'
			)
		})
	})

	it('applies token-based spacing across main dashboard sections on mobile', () => {
		render(<TenantDashboardPage />)

		const sections = [
			screen.getByTestId('tenant-dashboard-stats'),
			screen.getByTestId('tenant-dashboard-quick-actions'),
			screen.getByTestId('tenant-dashboard-activity')
		]

		sections.forEach(section => {
			expect(section).toHaveAttribute('data-spacing-section', 'comfortable')
			const inlineStyle = section.getAttribute('style') || ''
			expect(inlineStyle.includes('var(--layout-gap-group)')).toBe(true)
		})
	})
})
