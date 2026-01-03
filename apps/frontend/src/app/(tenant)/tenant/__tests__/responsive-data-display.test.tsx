/**
 * Responsive Data Display Tests (Payment History & Maintenance)
 *
 * These tests define the mobile card-based layouts required in Task 6
 * (Requirements 2.5). They currently fail against the existing table-only
 * implementation and will guide the responsive refactor.
 */

import type { ReactNode } from 'react'

import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BillingHistoryItem } from '@repo/shared/types/api-contracts'
import type {
	PaymentMethodResponse,
	MaintenanceRequest
} from '@repo/shared/types/core'
import TenantPaymentHistoryPage from '../payments/history/page'
import TenantMaintenancePage from '../maintenance/page'

const mockPayments: BillingHistoryItem[] = [
	{
		id: 'pay_1',
		subscriptionId: 'sub_1',
		tenant_id: 'tenant_1',
		amount: 150000,
		currency: 'usd',
		status: 'succeeded',
		stripePaymentIntentId: 'pi_123',
		description: 'January Rent',
		metadata: {},
		created_at: '2024-01-05T00:00:00Z',
		updated_at: '2024-01-05T00:00:00Z',
		formattedAmount: '$1,500.00',
		formattedDate: 'Jan 05, 2024',
		isSuccessful: true
	},
	{
		id: 'pay_2',
		subscriptionId: 'sub_1',
		tenant_id: 'tenant_1',
		amount: 155000,
		currency: 'usd',
		status: 'pending',
		stripePaymentIntentId: 'pi_124',
		description: 'February Rent',
		metadata: {},
		created_at: '2024-02-05T00:00:00Z',
		updated_at: '2024-02-05T00:00:00Z',
		formattedAmount: '$1,550.00',
		formattedDate: 'Feb 05, 2024',
		isSuccessful: false
	}
]

const mockPaymentMethods: PaymentMethodResponse[] = [
	{
		id: 'pm_1',
		tenantId: 'tenant_1',
		stripePaymentMethodId: 'pm_card_visa',
		type: 'card',
		last4: '4242',
		brand: 'visa',
		bankName: null,
		isDefault: true,
		createdAt: '2024-01-01'
	}
]

const mockMaintenanceRequests: MaintenanceRequest[] = [
	{
		id: 'req_1',
		description: 'Leaking sink in kitchen',
		status: 'open',
		priority: 'high',
		created_at: '2024-02-01T00:00:00Z',
		updated_at: '2024-02-02T00:00:00Z',
		completed_at: null,
		property_id: 'prop_1',
		unit_id: 'unit_1',
		tenant_id: 'tenant_1'
	} as unknown as MaintenanceRequest,
	{
		id: 'req_2',
		description: 'Replace hallway light',
		status: 'completed',
		priority: 'low',
		created_at: '2024-01-15T00:00:00Z',
		updated_at: '2024-01-20T00:00:00Z',
		completed_at: '2024-01-20T00:00:00Z',
		property_id: 'prop_1',
		unit_id: 'unit_1',
		tenant_id: 'tenant_1'
	} as unknown as MaintenanceRequest
]

function mockViewport(isMobile: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(query => ({
			matches: isMobile ? query.includes('max-width') : false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	})
}

// Mock data hooks before importing pages
vi.mock('#hooks/api/use-billing', () => ({
	useBillingHistory: vi.fn(() => ({ data: mockPayments, isLoading: false }))
}))

vi.mock('#hooks/api/use-payments', () => ({
	usePaymentMethods: vi.fn(() => ({
		data: mockPaymentMethods,
		isLoading: false
	}))
}))

vi.mock('@tanstack/react-query', async () => {
	const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
		'@tanstack/react-query'
	)
	return {
		...actual,
		useQuery: vi.fn(() => ({
			data: {
				requests: mockMaintenanceRequests,
				summary: { total: 2, open: 1, inProgress: 0, completed: 1 }
			},
			isLoading: false,
			error: null
		}))
	}
})

vi.mock('next/link', () => ({
	default: ({
		children,
		href
	}: {
		children: ReactNode
		href: string
	}) => <a href={href}>{children}</a>
}))

describe('Responsive Data Display (mobile-first)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders payment history as stacked cards on mobile (Requirement 2.5)', () => {
		mockViewport(true)
		render(<TenantPaymentHistoryPage />)

		const cards = screen.getAllByTestId('payment-history-card')
		expect(cards).toHaveLength(mockPayments.length)

		// Table view should be swapped out for the mobile card view
		expect(
			screen.queryByTestId('payment-history-table')
		).not.toBeInTheDocument()

		// Card contains the same key details and actions
		const firstCard = cards[0]!
		expect(firstCard).toHaveAttribute('data-layout', 'stacked')
		expect(firstCard).toHaveTextContent('Jan 05, 2024')
		expect(firstCard).toHaveTextContent('$1,500.00')
		expect(
			within(firstCard).getByRole('button', { name: /download receipt/i })
		).toBeInTheDocument()
	})

	it('keeps the sortable table view for desktop and preserves receipt actions', () => {
		mockViewport(false)
		render(<TenantPaymentHistoryPage />)

		const table = screen.getByTestId('payment-history-table')
		expect(table).toHaveAttribute('data-overflow-guard', 'true')

		// Rows still render with key info
		const rows = table.querySelectorAll('[data-testid="payment-history-row"]')
		expect(rows.length).toBe(mockPayments.length)

		// Receipt download action remains available on desktop
		expect(
			screen.getAllByRole('button', { name: /download receipt/i }).length
		).toBeGreaterThan(0)
	})

	it('renders maintenance requests as responsive cards on mobile (Requirement 2.5)', () => {
		mockViewport(true)
		render(<TenantMaintenancePage />)

		const cards = screen.getAllByTestId('maintenance-request-card')
		expect(cards).toHaveLength(mockMaintenanceRequests.length)

		// Cards stack content vertically to prevent overflow
		cards.forEach(card =>
			expect(card).toHaveAttribute('data-layout', 'stacked')
		)

		// Status badges remain visible in the mobile layout
		expect(screen.getByText(/open/i)).toBeInTheDocument()
		expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0)
	})

	it('shows maintenance requests in a desktop table while retaining cards on mobile (Requirement 2.5)', () => {
		mockViewport(false)
		render(<TenantMaintenancePage />)

		const activeTable = screen.getByTestId('maintenance-active-table')
		const historyTable = screen.getByTestId('maintenance-history-table')

		const activeRows = activeTable.querySelectorAll(
			'[data-testid="maintenance-row"]'
		)
		const historyRows = historyTable.querySelectorAll(
			'[data-testid="maintenance-row"]'
		)

		expect(activeRows.length).toBe(1)
		expect(historyRows.length).toBe(1)

		// Table should keep key details visible
		expect(activeTable).toHaveTextContent('Leaking sink in kitchen')
		expect(historyTable).toHaveTextContent('Replace hallway light')
	})
})
