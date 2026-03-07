/**
 * Payment Hooks Tests
 * Tests for PostgREST-based payment hooks (Phase 54-01 migration)
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	usePaymentAnalytics,
	useUpcomingPayments,
	useOverduePayments
} from '../use-payments'
import {
	useRecordManualPaymentMutation,
	useExportPaymentsMutation
} from '../use-payment-mutations'
import type { ReactNode } from 'react'

// Mock supabase client
vi.mock('#lib/supabase/client', () => ({
	createClient: vi.fn()
}))

// Mock cached user accessor (used by analytics hook instead of auth.getUser directly)
vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: vi.fn()
}))

// Mock postgrest error handler
vi.mock('#lib/postgrest-error-handler', () => ({
	handlePostgrestError: vi.fn((error: unknown) => {
		throw error
	})
}))

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
	const rpcMock = vi.fn().mockResolvedValue({ data: { totalRevenue: 500000 }, error: null })
	const fromMock = vi.fn().mockReturnValue({
		select: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data: null, error: null }),
		maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
		then: undefined,
		...overrides
	})
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
		},
		from: fromMock,
		rpc: rpcMock
	}
}

describe('Payment Hooks (PostgREST)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	describe('usePaymentAnalytics', () => {
		it('should fetch payment analytics successfully via RPC', async () => {
			const mockClient = createMockSupabaseClient()
			mockClient.rpc.mockResolvedValue({ data: { revenue: { monthly: 500000 } }, error: null })
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)
			vi.mocked(getCachedUser).mockResolvedValue({ id: 'user-1' } as Awaited<ReturnType<typeof getCachedUser>>)

			const { result } = renderHook(() => usePaymentAnalytics(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data?.totalCollected).toBe(500000)
			expect(mockClient.rpc).toHaveBeenCalledWith('get_dashboard_stats', { p_user_id: 'user-1' })
		})

		it('should handle unauthenticated error', async () => {
			const mockClient = createMockSupabaseClient()
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)
			vi.mocked(getCachedUser).mockResolvedValue(null)

			const { result } = renderHook(() => usePaymentAnalytics(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isError).toBe(true))
			expect(result.current.error).toBeDefined()
		})
	})

	describe('useUpcomingPayments', () => {
		it('should fetch upcoming payments via PostgREST', async () => {
			const mockPayments = [
				{
					id: '1',
					tenant_id: 't1',
					lease_id: 'l1',
					amount: 150000,
					currency: 'USD',
					status: 'pending',
					due_date: '2024-02-01',
					period_start: '2024-02-01',
					period_end: '2024-02-28'
				}
			]

			const chainMock = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
			}
			const mockClient = {
				auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
				from: vi.fn().mockReturnValue(chainMock),
				rpc: vi.fn()
			}
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)

			const { result } = renderHook(() => useUpcomingPayments(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data).toHaveLength(1)
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')
		})
	})

	describe('useOverduePayments', () => {
		it('should fetch overdue payments via PostgREST', async () => {
			const mockPayments = [
				{
					id: '1',
					tenant_id: 't1',
					lease_id: 'l1',
					amount: 150000,
					currency: 'USD',
					status: 'pending',
					due_date: '2024-01-01',
					period_start: '2024-01-01',
					period_end: '2024-01-31'
				}
			]

			const chainMock = {
				select: vi.fn().mockReturnThis(),
				lt: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
			}
			const mockClient = {
				auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
				from: vi.fn().mockReturnValue(chainMock),
				rpc: vi.fn()
			}
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)

			const { result } = renderHook(() => useOverduePayments(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data).toHaveLength(1)
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')
		})
	})

	describe('useRecordManualPaymentMutation', () => {
		it('should insert manual payment into rent_payments via PostgREST', async () => {
			const mockPaymentId = { id: 'p1' }
			const insertChain = {
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockPaymentId, error: null })
			}
			const mockClient = {
				auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
				from: vi.fn().mockReturnValue(insertChain),
				rpc: vi.fn()
			}
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)

			const { result } = renderHook(() => useRecordManualPaymentMutation(), {
				wrapper: createWrapper()
			})

			const response = await result.current.mutateAsync({
				lease_id: 'l1',
				tenant_id: 't1',
				amount: 1500,
				payment_method: 'cash',
				paid_date: '2024-01-15'
			})

			expect(response.success).toBe(true)
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')
			expect(insertChain.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					tenant_id: 't1',
					lease_id: 'l1',
					amount: 1500,
					status: 'succeeded',
					payment_method_type: 'cash',
					paid_date: '2024-01-15'
				})
			)
		})
	})

	describe('useExportPaymentsMutation', () => {
		it('should generate CSV from PostgREST data and trigger download', async () => {
			const mockRows = [
				{
					id: 'p1',
					amount: 150000,
					currency: 'USD',
					status: 'paid',
					due_date: '2024-01-15',
					paid_date: '2024-01-15',
					period_start: '2024-01-01',
					period_end: '2024-01-31',
					payment_method_type: 'cash',
					late_fee_amount: null,
					notes: null,
					created_at: '2024-01-15T00:00:00Z'
				}
			]

			const chainMock = {
				select: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockResolvedValue({ data: mockRows, error: null })
			}
			const mockClient = {
				auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
				from: vi.fn().mockReturnValue(chainMock),
				rpc: vi.fn()
			}
			vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>)

			// Mock URL methods
			const originalCreateObjectURL = URL.createObjectURL
			const originalRevokeObjectURL = URL.revokeObjectURL
			URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
			URL.revokeObjectURL = vi.fn()

			const { result } = renderHook(() => useExportPaymentsMutation(), {
				wrapper: createWrapper()
			})

			const blob = await result.current.mutateAsync({ status: 'paid' })

			expect(blob).toBeInstanceOf(Blob)
			expect(blob.type).toBe('text/csv')
			expect(mockClient.from).toHaveBeenCalledWith('rent_payments')

			// Restore URL methods
			URL.createObjectURL = originalCreateObjectURL
			URL.revokeObjectURL = originalRevokeObjectURL
		})
	})
})
