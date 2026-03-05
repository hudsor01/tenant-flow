/**
 * Financial Statement Hooks Tests
 *
 * Tests useIncomeStatement, useCashFlow, useBalanceSheet, useTaxDocuments
 * using Supabase RPC mocks. These hooks delegate to financial-keys.ts which
 * calls real RPCs (get_dashboard_stats, get_expense_summary, get_billing_insights).
 *
 * Note: useFinancialOverview, useMonthlyMetrics, useExpenseSummary are tested
 * in use-financial-overview.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import {
	useIncomeStatement,
	useCashFlow,
	useBalanceSheet,
	useTaxDocuments,
	financialKeys,
	expenseKeys
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
			queries: { retry: false, gcTime: 0 }
		}
	})
	return function Wrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

describe('financialKeys', () => {
	it('generates correct query keys', () => {
		expect(financialKeys.all).toEqual(['financials'])
		expect(financialKeys.overview()).toEqual(['financials', 'overview'])
		expect(financialKeys.monthly()).toEqual(['financials', 'monthly'])
		expect(financialKeys.expenseSummary()).toEqual(['financials', 'expense-summary'])
		expect(financialKeys.incomeStatement({ start_date: '2024-01-01', end_date: '2024-12-31' })).toEqual([
			'financials', 'income-statement', { start_date: '2024-01-01', end_date: '2024-12-31' }
		])
		expect(financialKeys.cashFlow({ start_date: '2024-01-01', end_date: '2024-12-31' })).toEqual([
			'financials', 'cash-flow', { start_date: '2024-01-01', end_date: '2024-12-31' }
		])
		expect(financialKeys.balanceSheet('2024-12-31')).toEqual([
			'financials', 'balance-sheet', '2024-12-31'
		])
	})
})

describe('expenseKeys', () => {
	it('generates correct query keys', () => {
		expect(expenseKeys.all).toEqual(['expenses'])
		expect(expenseKeys.list()).toEqual(['expenses', 'list'])
		expect(expenseKeys.detail('exp-1')).toEqual(['expenses', 'detail', 'exp-1'])
		expect(expenseKeys.byProperty('prop-1')).toEqual(['expenses', 'property', 'prop-1'])
		expect(expenseKeys.byDateRange('2024-01-01', '2024-12-31')).toEqual([
			'expenses', 'dateRange', '2024-01-01', '2024-12-31'
		])
	})
})

describe('useIncomeStatement', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches income statement from parallel RPCs', async () => {
		// incomeStatement() calls get_dashboard_stats + get_expense_summary in parallel
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000, monthly: 41667 }, units: { occupancy_rate: 94 } }],
				error: null
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000 },
				error: null
			})

		const { result } = renderHook(
			() => useIncomeStatement({ start_date: '2024-01-01', end_date: '2024-12-31' }),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		const data = result.current.data
		expect(data?.success).toBe(true)
		expect(data?.data?.revenue?.totalRevenue).toBe(500000)
		expect(data?.data?.expenses?.totalExpenses).toBe(120000)
		expect(data?.data?.netIncome).toBe(380000)
		expect(data?.data?.profitMargin).toBeCloseTo(76)
		expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { p_user_id: 'user-1' })
		expect(mockRpc).toHaveBeenCalledWith('get_expense_summary', { p_user_id: 'user-1' })
	})

	it('handles no user gracefully', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(
			() => useIncomeStatement({ start_date: '2024-01-01', end_date: '2024-12-31' }),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.data?.revenue?.totalRevenue).toBe(0)
		expect(result.current.data?.data?.netIncome).toBe(0)
	})
})

describe('useCashFlow', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches cash flow from parallel RPCs', async () => {
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000, monthly: 41667 }, units: {} }],
				error: null
			})
			.mockResolvedValueOnce({
				data: { monthly_average: 10000 },
				error: null
			})

		const { result } = renderHook(
			() => useCashFlow({ start_date: '2024-01-01', end_date: '2024-12-31' }),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		const data = result.current.data
		expect(data?.success).toBe(true)
		expect(data?.data?.operatingActivities?.rentalPaymentsReceived).toBe(41667)
		expect(data?.data?.operatingActivities?.operatingExpensesPaid).toBe(10000)
		expect(data?.data?.netCashFlow).toBe(31667)
	})
})

describe('useBalanceSheet', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches balance sheet from 3 parallel RPCs', async () => {
		// balanceSheet() calls get_dashboard_stats + get_expense_summary + get_billing_insights
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000, monthly: 41667 }, units: {} }],
				error: null
			})
			.mockResolvedValueOnce({
				data: { total_amount: 120000 },
				error: null
			})
			.mockResolvedValueOnce({
				data: { accounts_receivable: 15000 },
				error: null
			})

		const { result } = renderHook(
			() => useBalanceSheet('2024-12-31'),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		const data = result.current.data
		expect(data?.success).toBe(true)
		expect(data?.data?.assets?.currentAssets?.cash).toBe(500000)
		expect(data?.data?.assets?.currentAssets?.accountsReceivable).toBe(15000)
		expect(data?.data?.balanceCheck).toBe(true)
		expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { p_user_id: 'user-1' })
		expect(mockRpc).toHaveBeenCalledWith('get_expense_summary', { p_user_id: 'user-1' })
		expect(mockRpc).toHaveBeenCalledWith('get_billing_insights', { owner_id_param: 'user-1' })
	})
})

describe('useTaxDocuments', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches tax documents from parallel RPCs', async () => {
		mockRpc
			.mockResolvedValueOnce({
				data: [{ revenue: { yearly: 500000 }, units: {} }],
				error: null
			})
			.mockResolvedValueOnce({
				data: {
					total_amount: 120000,
					categories: [
						{ category: 'maintenance', amount: 60000, percentage: 50 },
						{ category: 'insurance', amount: 60000, percentage: 50 }
					]
				},
				error: null
			})

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		const data = result.current.data
		expect(data?.taxYear).toBe(2024)
		expect(data?.totals?.totalIncome).toBe(500000)
		expect(data?.totals?.totalDeductions).toBe(120000)
		expect(data?.totals?.netTaxableIncome).toBe(380000)
		expect(data?.expenseCategories?.length).toBe(2)
		expect(data?.schedule?.scheduleE?.grossRentalIncome).toBe(500000)
	})

	it('returns defaults when no user', async () => {
		mockGetCachedUser.mockResolvedValue(null)

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.taxYear).toBe(2024)
		expect(result.current.data?.totals?.totalIncome).toBe(0)
		expect(result.current.data?.expenseCategories).toEqual([])
	})

	it('handles RPC error gracefully', async () => {
		mockRpc.mockRejectedValueOnce(new Error('Database error'))

		const { result } = renderHook(() => useTaxDocuments(2024), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(result.current.error).toBeDefined()
	})
})
