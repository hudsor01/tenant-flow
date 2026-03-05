/**
 * Reports Hooks Tests
 *
 * Tests report hooks that query real Supabase tables (reports, report_runs)
 * and RPCs (get_revenue_trends_optimized, get_billing_insights, etc.).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import {
	useMonthlyRevenue,
	usePaymentAnalytics,
	useOccupancyMetrics,
	useFinancialReport,
	useMaintenanceReport,
	useYearEndSummary,
	use1099Summary,
	reportsKeys
} from '../use-reports'

// Mock Supabase client using vi.hoisted() to avoid initialization errors
const {
	mockRpc,
	mockGetCachedUser
} = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn()
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		rpc: mockRpc,
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			getSession: vi.fn().mockResolvedValue({ data: { session: null } })
		}
	})
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: mockGetCachedUser
}))

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false }
		}
	})
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

describe('reportsKeys', () => {
	it('generates correct query keys', () => {
		expect(reportsKeys.all).toEqual(['reports'])
		expect(reportsKeys.lists()).toEqual(['reports', 'list'])
		expect(reportsKeys.list(0, 20)).toEqual(['reports', 'list', 0, 20])
		expect(reportsKeys.revenue(12)).toEqual(['reports', 'revenue', 'monthly', 12])
		expect(reportsKeys.paymentAnalytics('2024-01-01', '2024-12-31')).toEqual([
			'reports', 'analytics', 'payments', '2024-01-01', '2024-12-31'
		])
		expect(reportsKeys.occupancyMetrics()).toEqual(['reports', 'analytics', 'occupancy'])
		expect(reportsKeys.financial('2024-01-01', '2024-12-31')).toEqual([
			'reports', 'financial', '2024-01-01', '2024-12-31'
		])
		expect(reportsKeys.yearEnd(2024)).toEqual(['reports', 'year-end', 2024])
		expect(reportsKeys.report1099(2024)).toEqual(['reports', '1099', 2024])
	})
})

describe('useMonthlyRevenue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches monthly revenue data from get_revenue_trends_optimized', async () => {
		// The RPC returns rows with revenue/expenses/profit (or net_income) keys
		mockRpc.mockResolvedValueOnce({
			data: [
				{ month: '2024-01', revenue: 40000, expenses: 10000, net_income: 30000, property_count: 3 },
				{ month: '2024-02', revenue: 42000, expenses: 11000, net_income: 31000, property_count: 3 }
			],
			error: null
		})

		const { result } = renderHook(() => useMonthlyRevenue(12), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.length).toBe(2)
		expect(result.current.data?.[0]?.month).toBe('2024-01')
		expect(result.current.data?.[0]?.revenue).toBe(40000)
		expect(result.current.data?.[0]?.expenses).toBe(10000)
		expect(result.current.data?.[0]?.profit).toBe(30000)
		expect(result.current.data?.[0]?.propertyCount).toBe(3)
		expect(mockRpc).toHaveBeenCalledWith('get_revenue_trends_optimized', {
			p_user_id: 'user-1',
			p_months: 12
		})
	})

	it('returns empty array when no user', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(() => useMonthlyRevenue(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual([])
	})
})

describe('usePaymentAnalytics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches payment analytics from get_billing_insights', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				total_payments: 50,
				successful_payments: 48,
				failed_payments: 2,
				total_revenue: 250000,
				average_payment: 5000,
				by_method: { card: 30, ach: 20 },
				by_status: { completed: 48, pending: 0, failed: 2 }
			},
			error: null
		})

		const { result } = renderHook(
			() => usePaymentAnalytics('2024-01-01', '2024-12-31'),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.totalRevenue).toBeDefined()
		expect(mockRpc).toHaveBeenCalledWith('get_billing_insights', expect.objectContaining({
			owner_id_param: 'user-1'
		}))
	})

	it('returns defaults when no user', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(
			() => usePaymentAnalytics(),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.totalPayments).toBe(0)
		expect(result.current.data?.totalRevenue).toBe(0)
	})
})

describe('useOccupancyMetrics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches occupancy data from get_occupancy_trends_optimized', async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{
					month: '2024-01',
					total_units: 20,
					occupied_units: 18,
					vacant_units: 2,
					occupancy_rate: 90,
					by_property: []
				}
			],
			error: null
		})

		const { result } = renderHook(() => useOccupancyMetrics(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.occupancyRate).toBeDefined()
		expect(mockRpc).toHaveBeenCalledWith('get_occupancy_trends_optimized', expect.objectContaining({
			p_owner_id: 'user-1'
		}))
	})

	it('returns defaults when no user', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(() => useOccupancyMetrics(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.totalUnits).toBe(0)
		expect(result.current.data?.occupancyRate).toBe(0)
	})
})

describe('useFinancialReport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches financial report from parallel RPCs', async () => {
		// financial() calls get_dashboard_stats + get_expense_summary
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 600000, monthly: 50000 }, units: { occupancy_rate: 95 } }],
				error: null
			})
			.mockResolvedValueOnce({
				data: {
					total_amount: 200000,
					categories: [{ category: 'maintenance', amount: 100000, percentage: 50 }]
				},
				error: null
			})

		const { result } = renderHook(
			() => useFinancialReport('2024-01-01', '2024-12-31'),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.summary?.totalIncome).toBe(600000)
		expect(result.current.data?.summary?.totalExpenses).toBe(200000)
		expect(result.current.data?.summary?.netIncome).toBe(400000)
	})
})

describe('useMaintenanceReport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches maintenance analytics', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				total_requests: 25,
				open_requests: 3,
				avg_resolution_hours: 48,
				total_cost: 15000,
				average_cost: 600,
				by_status: [{ status: 'open', count: 3 }],
				by_priority: [{ priority: 'high', count: 5 }],
				monthly_cost: [{ month: '2024-01', cost: 2000 }],
				vendor_performance: [{ vendor_name: 'Test Vendor', total_spend: 5000, jobs: 10 }]
			},
			error: null
		})

		const { result } = renderHook(
			() => useMaintenanceReport(),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.summary?.totalRequests).toBe(25)
		expect(result.current.data?.summary?.openRequests).toBe(3)
		expect(result.current.data?.vendorPerformance?.length).toBe(1)
		expect(mockRpc).toHaveBeenCalledWith('get_maintenance_analytics', { user_id: 'user-1' })
	})
})

describe('useYearEndSummary', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches year-end summary from parallel RPCs', async () => {
		// yearEnd() calls get_dashboard_stats + get_expense_summary + get_property_performance_analytics
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000, monthly: 41667 }, units: {} }],
				error: null
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000, categories: [] },
				error: null
			})
			.mockResolvedValueOnce({
				data: [{ property_id: 'p1', property_name: 'Test', total_revenue: 500000, total_expenses: 120000, net_income: 380000, occupancy_rate: 95, timeframe: '2024' }],
				error: null
			})

		const { result } = renderHook(() => useYearEndSummary(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.year).toBe(2024)
		expect(result.current.data?.grossRentalIncome).toBe(500000)
		expect(result.current.data?.operatingExpenses).toBe(120000)
		expect(result.current.data?.netIncome).toBe(380000)
	})
})

describe('use1099Summary', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches 1099 vendor data from get_expense_summary', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				vendor_payments: [
					{ vendor_name: 'Plumber Inc', total_paid: 15000, job_count: 5 },
					{ vendor_name: 'Electrician LLC', total_paid: 8000, job_count: 3 }
				]
			},
			error: null
		})

		const { result } = renderHook(() => use1099Summary(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.year).toBe(2024)
		expect(result.current.data?.threshold).toBe(600)
		expect(result.current.data?.recipients?.length).toBe(2)
		expect(result.current.data?.totalReported).toBe(23000)
		expect(mockRpc).toHaveBeenCalledWith('get_expense_summary', { p_user_id: 'user-1' })
	})

	it('returns defaults when no user', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(() => use1099Summary(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.year).toBe(2024)
		expect(result.current.data?.recipients).toEqual([])
		expect(result.current.data?.totalReported).toBe(0)
	})
})
