/**
 * Expenses Hooks Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
	useExpenses,
	useExpensesByProperty,
	useExpensesByDateRange,
	useCreateExpenseMutation,
	useDeleteExpenseMutation,
	expenseKeys
} from '../use-financials'

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

describe('expenseKeys', () => {
	it('generates correct query keys', () => {
		expect(expenseKeys.all).toEqual(['expenses'])
		expect(expenseKeys.list()).toEqual(['expenses', 'list'])
		expect(expenseKeys.detail('123')).toEqual(['expenses', 'detail', '123'])
		expect(expenseKeys.byProperty('prop-1')).toEqual([
			'expenses',
			'property',
			'prop-1'
		])
		expect(expenseKeys.byDateRange('2024-01-01', '2024-12-31')).toEqual([
			'expenses',
			'dateRange',
			'2024-01-01',
			'2024-12-31'
		])
	})
})

describe('useExpenses', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it('fetches all expenses successfully', async () => {
		const mockExpenses = {
			success: true,
			data: [
				{
					id: 'exp-1',
					description: 'Water heater replacement',
					category: 'maintenance',
					amount: 125000,
					property_name: 'Downtown Lofts',
					expense_date: '2024-12-20',
					vendor_name: 'Austin Plumbing'
				},
				{
					id: 'exp-2',
					description: 'HVAC repair',
					category: 'maintenance',
					amount: 45000,
					property_name: 'Riverside Apartments',
					expense_date: '2024-12-18',
					vendor_name: 'Cool Air Services'
				}
			]
		}

		mockApiRequest.mockResolvedValueOnce(mockExpenses)

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.length).toBe(2)
		expect(result.current.data?.[0]?.description).toBe(
			'Water heater replacement'
		)
	})

	it('handles empty expense list', async () => {
		mockApiRequest.mockResolvedValueOnce({ success: true, data: [] })

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual([])
	})

	it('respects enabled option', async () => {
		const { result } = renderHook(() => useExpenses({ enabled: false }), {
			wrapper: createWrapper()
		})

		// Should not fetch when disabled
		expect(result.current.isFetching).toBe(false)
		expect(mockApiRequest).not.toHaveBeenCalled()
	})
})

describe('useExpensesByProperty', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('fetches expenses for a specific property', async () => {
		const mockExpenses = {
			success: true,
			data: [
				{
					id: 'exp-1',
					description: 'Water heater replacement',
					category: 'maintenance',
					amount: 125000,
					property_id: 'prop-1',
					expense_date: '2024-12-20'
				}
			]
		}

		mockApiRequest.mockResolvedValueOnce(mockExpenses)

		const { result } = renderHook(() => useExpensesByProperty('prop-1'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(mockApiRequest).toHaveBeenCalledWith(
			'/api/v1/financials/expenses?property_id=prop-1'
		)
	})

	it('does not fetch when propertyId is empty', () => {
		const { result } = renderHook(() => useExpensesByProperty(''), {
			wrapper: createWrapper()
		})

		expect(result.current.isFetching).toBe(false)
		expect(mockApiRequest).not.toHaveBeenCalled()
	})
})

describe('useExpensesByDateRange', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('fetches expenses within date range', async () => {
		const mockExpenses = {
			success: true,
			data: [
				{
					id: 'exp-1',
					description: 'Insurance payment',
					category: 'insurance',
					amount: 275000,
					expense_date: '2024-12-01'
				}
			]
		}

		mockApiRequest.mockResolvedValueOnce(mockExpenses)

		const { result } = renderHook(
			() => useExpensesByDateRange('2024-12-01', '2024-12-31'),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(mockApiRequest).toHaveBeenCalledWith(
			'/api/v1/financials/expenses?start_date=2024-12-01&end_date=2024-12-31'
		)
	})
})

describe('useCreateExpenseMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('creates a new expense successfully', async () => {
		const newExpense = {
			amount: 50000,
			expense_date: '2024-12-25',
			maintenance_request_id: 'mr-test-123',
			vendor_name: 'Test Vendor'
		}

		const mockResponse = {
			success: true,
			data: { id: 'exp-new', ...newExpense }
		}

		mockApiRequest.mockResolvedValueOnce(mockResponse)

		const { result } = renderHook(() => useCreateExpenseMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync(newExpense)

		expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/financials/expenses', {
			method: 'POST',
			body: JSON.stringify(newExpense)
		})
	})
})

describe('useDeleteExpenseMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('deletes an expense successfully', async () => {
		mockApiRequest.mockResolvedValueOnce(undefined)

		const { result } = renderHook(() => useDeleteExpenseMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('exp-1')

		expect(mockApiRequest).toHaveBeenCalledWith(
			'/api/v1/financials/expenses/exp-1',
			{
				method: 'DELETE'
			}
		)
	})
})
