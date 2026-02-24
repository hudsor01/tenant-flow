/**
 * Expenses Hooks Tests
 *
 * Tests expense hooks using Supabase mock (migrated from NestJS apiRequest in Phase 53).
 * Note: useExpensesByProperty does not filter by property_id server-side because
 * the expenses table doesn't have that column (TODO: phase-57).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import {
	useExpenses,
	useExpensesByProperty,
	useExpensesByDateRange,
	useCreateExpenseMutation,
	useDeleteExpenseMutation,
	expenseKeys
} from '../use-financials'

// Supabase mock using vi.hoisted() to avoid initialization errors
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockGte,
	mockLte,
	mockOrder,
	mockInsert,
	mockDelete,
	mockSingle
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockGte: vi.fn(),
	mockLte: vi.fn(),
	mockOrder: vi.fn(),
	mockInsert: vi.fn(),
	mockDelete: vi.fn(),
	mockSingle: vi.fn()
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		from: mockFrom
	})
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

const mockExpenseRow = {
	id: 'exp-1',
	amount: 125000,
	expense_date: '2024-12-20',
	vendor_name: 'Austin Plumbing',
	maintenance_request_id: null,
	created_at: '2024-12-20T00:00:00Z'
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
		const selectChain = { order: mockOrder }
		mockSelect.mockReturnValue(selectChain)
		mockOrder.mockResolvedValue({ data: [mockExpenseRow, { ...mockExpenseRow, id: 'exp-2', vendor_name: 'Cool Air Services' }], error: null })
		mockFrom.mockReturnValue({ select: mockSelect })

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.length).toBe(2)
		expect(mockFrom).toHaveBeenCalledWith('expenses')
	})

	it('handles empty expense list', async () => {
		const selectChain = { order: mockOrder }
		mockSelect.mockReturnValue(selectChain)
		mockOrder.mockResolvedValue({ data: [], error: null })
		mockFrom.mockReturnValue({ select: mockSelect })

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data).toEqual([])
	})

	it('respects enabled option', () => {
		const { result } = renderHook(() => useExpenses({ enabled: false }), {
			wrapper: createWrapper()
		})

		// Should not fetch when disabled
		expect(result.current.isFetching).toBe(false)
		expect(mockFrom).not.toHaveBeenCalled()
	})
})

describe('useExpensesByProperty', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('fetches expenses for a specific property', async () => {
		const selectChain = { order: mockOrder }
		mockSelect.mockReturnValue(selectChain)
		mockOrder.mockResolvedValue({ data: [mockExpenseRow], error: null })
		mockFrom.mockReturnValue({ select: mockSelect })

		const { result } = renderHook(() => useExpensesByProperty('prop-1'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(mockFrom).toHaveBeenCalledWith('expenses')
	})

	it('does not fetch when propertyId is empty', () => {
		const { result } = renderHook(() => useExpensesByProperty(''), {
			wrapper: createWrapper()
		})

		expect(result.current.isFetching).toBe(false)
		expect(mockFrom).not.toHaveBeenCalled()
	})
})

describe('useExpensesByDateRange', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('fetches expenses within date range', async () => {
		const chain = { gte: mockGte, lte: mockLte, order: mockOrder }
		mockSelect.mockReturnValue(chain)
		mockGte.mockReturnValue(chain)
		mockLte.mockReturnValue(chain)
		mockOrder.mockResolvedValue({ data: [mockExpenseRow], error: null })
		mockFrom.mockReturnValue({ select: mockSelect })

		const { result } = renderHook(
			() => useExpensesByDateRange('2024-12-01', '2024-12-31'),
			{ wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockGte).toHaveBeenCalledWith('expense_date', '2024-12-01')
		expect(mockLte).toHaveBeenCalledWith('expense_date', '2024-12-31')
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

		const createdExpense = { id: 'exp-new', ...newExpense, created_at: '2024-12-25T00:00:00Z' }
		const selectChain = { single: mockSingle }
		const insertChain = { select: mockSelect }
		mockInsert.mockReturnValue(insertChain)
		mockSelect.mockReturnValue(selectChain)
		mockSingle.mockResolvedValue({ data: createdExpense, error: null })
		mockFrom.mockReturnValue({ insert: mockInsert })

		const { result } = renderHook(() => useCreateExpenseMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync(newExpense)

		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockInsert).toHaveBeenCalledWith({
			amount: 50000,
			expense_date: '2024-12-25',
			maintenance_request_id: 'mr-test-123',
			vendor_name: 'Test Vendor'
		})
	})
})

describe('useDeleteExpenseMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('deletes an expense successfully', async () => {
		const deleteChain = { eq: mockEq }
		mockDelete.mockReturnValue(deleteChain)
		mockEq.mockResolvedValue({ data: null, error: null })
		mockFrom.mockReturnValue({ delete: mockDelete })

		const { result } = renderHook(() => useDeleteExpenseMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('exp-1')

		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockEq).toHaveBeenCalledWith('id', 'exp-1')
	})
})
