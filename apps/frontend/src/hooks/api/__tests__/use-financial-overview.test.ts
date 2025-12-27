/**
 * Financial Overview Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
	useFinancialOverview,
	useMonthlyMetrics,
	useExpenseSummary
} from '../use-financial-overview'

// Mock the api-request module
vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn()
}))

import { apiRequest } from '#lib/api-request'

const mockApiRequest = vi.mocked(apiRequest)

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0
			}
		}
	})
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children)
	}
}

describe('useFinancialOverview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches financial overview data successfully', async () => {
		const mockData = {
			success: true,
			data: {
				overview: {
					total_revenue: 500000,
					total_expenses: 125000,
					net_income: 375000,
					accounts_receivable: 25000,
					accounts_payable: 5000
				},
				highlights: [
					{ label: 'Monthly Revenue', value: 41667, trend: 5.2 },
					{ label: 'Operating Margin', value: 75, trend: 2.1 },
					{ label: 'Occupancy Rate', value: 94, trend: 0.5 }
				]
			}
		}

		mockApiRequest.mockResolvedValueOnce(mockData)

		const { result } = renderHook(() => useFinancialOverview(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual(mockData.data)
		expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/financials/overview')
	})

	it('handles error state', async () => {
		mockApiRequest.mockRejectedValueOnce(new Error('Network error'))

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
	})

	it('fetches monthly metrics data successfully', async () => {
		const mockData = {
			success: true,
			data: [
				{ month: '2024-01', revenue: 40000, expenses: 10000, net_income: 30000, cash_flow: 30000 },
				{ month: '2024-02', revenue: 42000, expenses: 11000, net_income: 31000, cash_flow: 31000 },
				{ month: '2024-03', revenue: 43000, expenses: 10500, net_income: 32500, cash_flow: 32500 }
			]
		}

		mockApiRequest.mockResolvedValueOnce(mockData)

		const { result } = renderHook(() => useMonthlyMetrics(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual(mockData.data)
		expect(result.current.data?.length).toBe(3)
	})

	it('returns empty array when no data', async () => {
		mockApiRequest.mockResolvedValueOnce({ success: true, data: [] })

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
	})

	it('fetches expense summary with category breakdown', async () => {
		const mockData = {
			success: true,
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
			}
		}

		mockApiRequest.mockResolvedValueOnce(mockData)

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
