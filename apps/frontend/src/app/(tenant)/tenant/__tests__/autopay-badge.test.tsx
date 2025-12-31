/**
 * Autopay Status Badge Tests
 *
 * These tests verify the tenant dashboard behavior with different autopay states.
 *
 * NOTE: The autopay badge feature is planned but not yet implemented in the
 * current TenantStatsCards component. These tests verify that the dashboard
 * renders correctly regardless of autopay status.
 *
 * Requirements covered:
 * - 7.3: Dashboard renders correctly with various autopay states
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
const mockUseTenantLeaseDocuments = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantPortalDashboard: () => mockUseTenantPortalDashboard(),
	useTenantLeaseDocuments: () => mockUseTenantLeaseDocuments()
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

vi.mock('#components/tours/tenant-onboarding-tour', () => ({
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

describe('Autopay Status on Dashboard (Requirement 7.3)', () => {
	const mockDashboardData = {
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
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockUseTenantPortalDashboard.mockReturnValue({
			data: mockDashboardData,
			isLoading: false
		})
		mockUseTenantLeaseDocuments.mockReturnValue({
			data: { documents: [] },
			isLoading: false
		})
	})

	it('renders stat cards correctly when autopay is enabled', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123',
				nextPaymentDate: '2024-02-01'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		// Dashboard should render 4 stat cards using design-os pattern
		const statCards = document.querySelectorAll('[data-slot="stat"]')
		expect(statCards.length).toBe(4)

		// Each card should have proper styling (Stat component uses rounded-lg)
		statCards.forEach(card => {
			expect(card).toHaveClass('rounded-lg')
			expect(card).toHaveClass('border')
			expect(card).toHaveClass('bg-card')
		})
	})

	it('renders stat cards with proper indicators when autopay is enabled', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		// Stat indicators should exist
		const indicators = document.querySelectorAll('[data-slot="stat-indicator"]')
		expect(indicators.length).toBeGreaterThan(0)
	})

	it('renders stat cards correctly when autopay is disabled', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: false,
				subscriptionId: null
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		// Dashboard should still render 4 stat cards
		const statCards = document.querySelectorAll('[data-slot="stat"]')
		expect(statCards.length).toBe(4)
	})

	it('renders stat cards correctly when autopay data is null', () => {
		setAutopayResponse({
			data: null,
			isLoading: false
		})

		render(<TenantDashboardPage />)

		// Dashboard should still render 4 stat cards
		const statCards = document.querySelectorAll('[data-slot="stat"]')
		expect(statCards.length).toBe(4)
	})

	it('renders stat cards correctly while loading autopay status', () => {
		setAutopayResponse({
			data: undefined,
			isLoading: true
		})

		render(<TenantDashboardPage />)

		// Dashboard should still render 4 stat cards during loading
		const statCards = document.querySelectorAll('[data-slot="stat"]')
		expect(statCards.length).toBe(4)
	})

	it('renders all required dashboard sections', () => {
		setAutopayResponse({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantDashboardPage />)

		// Should have welcome section
		expect(screen.getByText(/welcome back/i)).toBeInTheDocument()

		// Should have payment history section - may appear multiple times
		const paymentHistoryElements = screen.getAllByText(/payment history/i)
		expect(paymentHistoryElements.length).toBeGreaterThan(0)

		// Should have maintenance section - may appear multiple times
		const maintenanceElements = screen.getAllByText(/maintenance/i)
		expect(maintenanceElements.length).toBeGreaterThan(0)
	})
})
