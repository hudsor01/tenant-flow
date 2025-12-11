/**
 * Property-Based Test: Autopay Status Visibility
 *
 * **Feature: tenant-onboarding-optimization, Property 7: Autopay Status Visibility**
 * **Validates: Requirements 7.3**
 *
 * Property: For any tenant with autopay enabled, the dashboard SHALL display
 * a visible indicator showing autopay is active.
 *
 * This property test generates random autopay states and verifies that:
 * 1. When autopay is enabled, the badge is visible
 * 2. When autopay is disabled, the badge is not visible
 * 3. The badge appears on the payment stat card specifically
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

type MockQueryOptions = {
	queryKey?: Array<string | unknown>
}

type AutopayStatus = {
	autopayEnabled: boolean
	subscriptionId: string | null
	nextPaymentDate: string | null
	lease_id: string | null
	tenant_id: string | null
}

// Mock the hooks
const mockUseTenantPortalDashboard = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantPortalDashboard: () => mockUseTenantPortalDashboard()
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
	useQuery: (options: MockQueryOptions) => mockUseQuery(options)
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

describe('Property Test: Autopay Status Visibility (Property 7)', () => {
	const mockDashboardData = {
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
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseTenantPortalDashboard.mockReturnValue({
			data: mockDashboardData,
			isLoading: false
		})
	})

	it('Property 7: Autopay badge visibility matches autopay enabled status', () => {
		fc.assert(
			fc.property(
				// Generate random autopay states
				fc.record({
					autopayEnabled: fc.boolean(),
					subscriptionId: fc.option(fc.string(), { nil: null }),
					nextPaymentDate: fc.option(
						// Constrain dates to valid range to avoid Invalid Date errors
						fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
						{ nil: null }
					),
					lease_id: fc.option(fc.uuid(), { nil: null }),
					tenant_id: fc.option(fc.uuid(), { nil: null })
				}),
				(autopayStatus: AutopayStatus) => {
					// Setup mock for this iteration
					mockUseQuery.mockImplementation((options: MockQueryOptions) => {
						const queryKey = options?.queryKey || []
						if (queryKey.includes('tenant-autopay')) {
							return {
								data: autopayStatus,
								isLoading: false
							}
						}
						return { data: null, isLoading: false }
					})

					// Render component
					const { unmount } = render(<TenantDashboardPage />)

					try {
						// Property: Badge visibility should match autopayEnabled status
						const autopayBadge = screen.queryByTestId('autopay-badge')

						if (autopayStatus.autopayEnabled) {
							// When autopay is enabled, badge MUST be visible
							expect(autopayBadge).toBeInTheDocument()
							expect(autopayBadge).toHaveTextContent('Autopay Active')

							// Badge should be on the payment card
							const statCards = screen.getAllByTestId('stat-card')
							const paymentCard = statCards[1] // Payment card is second
							expect(paymentCard).toContainElement(autopayBadge)
						} else {
							// When autopay is disabled, badge MUST NOT be visible
							expect(autopayBadge).not.toBeInTheDocument()
						}
					} finally {
						unmount()
					}
				}
			),
			{ numRuns: 100 } // Run 100 iterations as specified in design doc
		)
	})

	it('Property 7 (Edge Case): Autopay badge not shown during loading state', () => {
		fc.assert(
			fc.property(
				fc.boolean(), // Random autopayEnabled value
				_autopayEnabled => {
					// Setup mock for loading state
					mockUseQuery.mockImplementation((options: MockQueryOptions) => {
						const queryKey = options?.queryKey || []
						if (queryKey.includes('tenant-autopay')) {
							return {
								data: undefined,
								isLoading: true
							}
						}
						return { data: null, isLoading: false }
					})

					// Render component
					const { unmount } = render(<TenantDashboardPage />)

					try {
						// Property: Badge should NOT be visible during loading
						const autopayBadge = screen.queryByTestId('autopay-badge')
						expect(autopayBadge).not.toBeInTheDocument()
					} finally {
						unmount()
					}
				}
			),
			{ numRuns: 100 }
		)
	})

	it('Property 7 (Edge Case): Autopay badge not shown when data is null', () => {
		fc.assert(
			fc.property(
				fc.constant(null), // Always null
				() => {
					// Setup mock for null data
					mockUseQuery.mockImplementation((options: MockQueryOptions) => {
						const queryKey = options?.queryKey || []
						if (queryKey.includes('tenant-autopay')) {
							return {
								data: null,
								isLoading: false
							}
						}
						return { data: null, isLoading: false }
					})

					// Render component
					const { unmount } = render(<TenantDashboardPage />)

					try {
						// Property: Badge should NOT be visible when data is null
						const autopayBadge = screen.queryByTestId('autopay-badge')
						expect(autopayBadge).not.toBeInTheDocument()
					} finally {
						unmount()
					}
				}
			),
			{ numRuns: 100 }
		)
	})
})
