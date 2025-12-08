/**
 * Autopay Status Badge Tests
 *
 * These tests verify that the autopay status badge appears correctly on the dashboard
 * as specified in Requirement 7.3
 *
 * Requirements covered:
 * - 7.3: Autopay badge appears when enabled, hidden when disabled
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

type MockQueryOptions = {
	queryKey?: Array<string | unknown>
}

type AutopayResponse = {
	data: unknown
	isLoading: boolean
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

const setAutopayResponse = (response: AutopayResponse) => {
	mockUseQuery.mockImplementation((options: MockQueryOptions) => {
		const queryKey = options?.queryKey ?? []
		if (queryKey.includes('tenant-autopay')) {
			return response
		}
		return { data: null, isLoading: false }
	})
}

describe('Autopay Status Badge on Dashboard (Requirement 7.3)', () => {
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

	it('displays "Autopay Active" badge on payment stat card when autopay is enabled', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123',
				nextPaymentDate: '2024-02-01'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		const autopayBadge = screen.getByTestId('autopay-badge')
		expect(autopayBadge).toBeInTheDocument()
		expect(autopayBadge).toHaveTextContent('Autopay Active')
	})

	it('uses success color for autopay enabled badge', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		const autopayBadge = screen.getByTestId('autopay-badge')
		expect(autopayBadge).toHaveAttribute('data-variant', 'success')
	})

	it('does NOT display autopay badge when autopay is disabled', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: false,
				subscriptionId: null
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		const autopayBadge = screen.queryByTestId('autopay-badge')
		expect(autopayBadge).not.toBeInTheDocument()
	})

	it('does NOT display autopay badge when autopay data is null', () => {
		setAutopayResponse({
			data: null,
			isLoading: false
		})

		render(<TenantDashboardPage />)

		const autopayBadge = screen.queryByTestId('autopay-badge')
		expect(autopayBadge).not.toBeInTheDocument()
	})

	it('does NOT display autopay badge while loading autopay status', () => {
		setAutopayResponse({
			data: undefined,
			isLoading: true
		})

		render(<TenantDashboardPage />)

		const autopayBadge = screen.queryByTestId('autopay-badge')
		expect(autopayBadge).not.toBeInTheDocument()
	})

	it('displays autopay badge on the payment stat card specifically', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		const statCards = screen.getAllByTestId('stat-card')
		expect(statCards.length).toBe(3) // Lease, Payment, Maintenance

		const paymentCard = statCards[1]
		const autopayBadge = screen.getByTestId('autopay-badge')
		expect(paymentCard).toContainElement(autopayBadge)
	})
})
