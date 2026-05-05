/**
 * Expenses Hooks Tests
 *
 * Tests expense hooks using Supabase mock (migrated from NestJS apiRequest in Phase 53).
 * Note: useExpensesByProperty does not filter by property_id server-side because
 * the expenses table doesn't have a property_id column.
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
} from '../use-expense-mutations'
import { expenseKeys } from '../query-keys/expense-keys'

// Supabase mock using vi.hoisted() to avoid initialization errors
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockNeq,
	mockIn,
	mockGte,
	mockLte,
	mockOrder,
	mockLimit,
	mockInsert,
	mockUpdate,
	mockSingle
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockNeq: vi.fn(),
	mockIn: vi.fn(),
	mockGte: vi.fn(),
	mockLte: vi.fn(),
	mockOrder: vi.fn(),
	mockLimit: vi.fn(),
	mockInsert: vi.fn(),
	mockUpdate: vi.fn(),
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
	status: 'active',
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
		const selectChain = { neq: mockNeq }
		const neqChain = { order: mockOrder }
		const orderChain = { limit: mockLimit }
		mockSelect.mockReturnValue(selectChain)
		mockNeq.mockReturnValue(neqChain)
		mockOrder.mockReturnValue(orderChain)
		// useExpenses applies the default 1000-row ceiling — chain ends in .limit()
		mockLimit.mockResolvedValue({
			data: [mockExpenseRow, { ...mockExpenseRow, id: 'exp-2', vendor_name: 'Cool Air Services' }],
			count: null,
			error: null
		})
		mockFrom.mockReturnValue({ select: mockSelect })

		const { result } = renderHook(() => useExpenses(), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(result.current.data?.length).toBe(2)
		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockNeq).toHaveBeenCalledWith('status', 'inactive')
		expect(mockLimit).toHaveBeenCalledWith(1000)
	})

	it('handles empty expense list', async () => {
		const selectChain = { neq: mockNeq }
		const neqChain = { order: mockOrder }
		const orderChain = { limit: mockLimit }
		mockSelect.mockReturnValue(selectChain)
		mockNeq.mockReturnValue(neqChain)
		mockOrder.mockReturnValue(orderChain)
		mockLimit.mockResolvedValue({ data: [], count: null, error: null })
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
		// Step 1: maintenance_requests query returns IDs (now bounded by .limit)
		const mrSelectChain = { eq: mockEq }
		const mrEqChain = { limit: mockLimit }
		mockEq.mockReturnValue(mrEqChain)

		// Step 2: expenses query filters by maintenance_request_id
		// Chain: from → select → in → neq → order → limit
		const expSelectChain = { in: mockIn }
		const inChain = { neq: mockNeq }
		const neqChain = { order: mockOrder }
		const orderChain = { limit: mockLimit }
		mockIn.mockReturnValue(inChain)
		mockNeq.mockReturnValue(neqChain)
		mockOrder.mockReturnValue(orderChain)

		// mockLimit is awaited at the end of BOTH queries — return the right
		// shape for whichever call this is. First call (maintenance_requests):
		// returns { data: [{id:...}] }. Second call (expenses): returns expense rows.
		let limitCall = 0
		mockLimit.mockImplementation(() => {
			limitCall += 1
			if (limitCall === 1) {
				return Promise.resolve({ data: [{ id: 'mr-1' }], error: null })
			}
			return Promise.resolve({ data: [mockExpenseRow], error: null })
		})

		mockFrom.mockImplementation((table: string) => {
			if (table === 'maintenance_requests') return { select: vi.fn().mockReturnValue(mrSelectChain) }
			return { select: mockSelect }
		})
		mockSelect.mockReturnValue(expSelectChain)

		const { result } = renderHook(() => useExpensesByProperty('prop-1'), {
			wrapper: createWrapper()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(mockFrom).toHaveBeenCalledWith('maintenance_requests')
		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockLimit).toHaveBeenCalledWith(1000)
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
		// Chain: from → select → neq → gte → lte → order → limit
		const chain = {
			neq: mockNeq,
			gte: mockGte,
			lte: mockLte,
			order: mockOrder,
			limit: mockLimit
		}
		mockSelect.mockReturnValue(chain)
		mockNeq.mockReturnValue(chain)
		mockGte.mockReturnValue(chain)
		mockLte.mockReturnValue(chain)
		mockOrder.mockReturnValue(chain)
		mockLimit.mockResolvedValue({ data: [mockExpenseRow], error: null })
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

	it('soft-deletes an expense by setting status to inactive', async () => {
		const updateChain = { eq: mockEq }
		mockUpdate.mockReturnValue(updateChain)
		mockEq.mockResolvedValue({ data: null, error: null })
		mockFrom.mockReturnValue({ update: mockUpdate })

		const { result } = renderHook(() => useDeleteExpenseMutation(), {
			wrapper: createWrapper()
		})

		await result.current.mutateAsync('exp-1')

		expect(mockFrom).toHaveBeenCalledWith('expenses')
		expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' })
		expect(mockEq).toHaveBeenCalledWith('id', 'exp-1')
	})
})
