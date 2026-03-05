/**
 * Financial Overview Hooks Tests
 *
 * Validates useFinancialOverview, useMonthlyMetrics, useExpenseSummary
 * using Supabase RPC mocks. Financial queries use real RPCs via financial-keys.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import {
	useFinancialOverview,
	useMonthlyMetrics,
	useExpenseSummary
} from '../use-financials'

// Mock Supabase client using vi.hoisted() to avoid initialization errors
const { mockRpc, mockGetCachedUser } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn()
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		rpc: mockRpc,
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null } })
		}
	})
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: mockGetCachedUser
}))

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0
			}
		}
	})
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

describe('useFinancialOverview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches financial overview data successfully', async () => {
		// overview() calls get_dashboard_stats + get_expense_summary in parallel
		mockRpc
			.mockResolvedValueOnce({
				data: [
					{
						revenue: { yearly: 500000, monthly: 41667 },
						units: { occupancy_rate: 94 }
					}
				],
				error: null
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000 },
				error: null
			})

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.overview?.total_revenue).toBe(500000)
		expect(result.current.data?.overview?.total_expenses).toBe(120000)
		expect(result.current.data?.overview?.net_income).toBe(380000)
		expect(result.current.data?.overview?.accounts_receivable).toBe(41667)
		expect(result.current.data?.highlights?.length).toBe(3)
		expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { p_user_id: 'user-1' })
		expect(mockRpc).toHaveBeenCalledWith('get_expense_summary', { p_user_id: 'user-1' })
	})

	it('handles error state', async () => {
		mockRpc.mockRejectedValueOnce(new Error('Network error'))

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(result.current.error).toBeDefined()
	})
})

describe('useMonthlyMetrics', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	it('fetches monthly metrics data successfully', async () => {
		mockRpc.mockResolvedValueOnce({
			data: [
				{ month: '2024-01', total_revenue: 40000, total_expenses: 10000, net_income: 30000 },
				{ month: '2024-02', total_revenue: 42000, total_expenses: 11000, net_income: 31000 },
				{ month: '2024-03', total_revenue: 43000, total_expenses: 10500, net_income: 32500 }
			],
			error: null
		})

		const { result } = renderHook(() => useMonthlyMetrics(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.length).toBe(3)
		expect(result.current.data?.[0]?.month).toBe('2024-01')
		expect(result.current.data?.[0]?.revenue).toBe(40000)
		expect(result.current.data?.[0]?.cash_flow).toBe(30000)
	})

	it('returns empty array when no data', async () => {
		mockRpc.mockResolvedValueOnce({ data: [], error: null })

		const { result } = renderHook(() => useMonthlyMetrics(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual([])
	})
})

describe('useExpenseSummary', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	it('fetches expense summary with category breakdown', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				categories: [
					{ category: 'maintenance', amount: 50000, percentage: 40 },
					{ category: 'utilities', amount: 25000, percentage: 20 },
					{ category: 'insurance', amount: 25000, percentage: 20 },
					{ category: 'other', amount: 25000, percentage: 20 }
				],
				monthly_totals: [
					{ month: '2024-01', amount: 10000 },
					{ month: '2024-02', amount: 11000 },
					{ month: '2024-03', amount: 10500 }
				],
				total_amount: 125000,
				monthly_average: 10416,
				year_over_year_change: -5.2
			},
			error: null
		})

		const { result } = renderHook(() => useExpenseSummary(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.categories?.length).toBe(4)
		expect(result.current.data?.total_amount).toBe(125000)
		expect(result.current.data?.year_over_year_change).toBe(-5.2)
	})
})
