/**
 * Payment Hooks Tests
 */

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	usePaymentAnalytics,
	useUpcomingPayments,
	useOverduePayments,
	useRecordManualPaymentMutation,
	useExportPaymentsMutation
} from '../use-payments'
import * as apiRequest from '#lib/api-request'
import type { ReactNode } from 'react'

vi.mock('#lib/api-request', () => ({
	apiRequest: vi.fn(),
	apiRequestRaw: vi.fn()
}))

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

describe('Payment Hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	describe('usePaymentAnalytics', () => {
		it('should fetch payment analytics successfully', async () => {
			const mockAnalytics = {
				totalCollected: 500000,
				totalPending: 100000,
				totalOverdue: 50000,
				collectionRate: 80.5,
				averagePaymentTime: 2.3,
				onTimePaymentRate: 95.2,
				monthlyTrend: [
					{
						month: 'Jan',
						monthNumber: 1,
						collected: 125000,
						pending: 25000,
						failed: 0
					}
				]
			}

			vi.mocked(apiRequest.apiRequest).mockResolvedValue({
				success: true,
				analytics: mockAnalytics
			})

			const { result } = renderHook(() => usePaymentAnalytics(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data).toEqual(mockAnalytics)
			expect(apiRequest.apiRequest).toHaveBeenCalledWith(
				'/api/v1/rent-payments/analytics'
			)
		})

		it('should handle error state', async () => {
			vi.mocked(apiRequest.apiRequest).mockRejectedValue(
				new Error('Network error')
			)

			const { result } = renderHook(() => usePaymentAnalytics(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isError).toBe(true))

			expect(result.current.error).toBeDefined()
		})
	})

	describe('useUpcomingPayments', () => {
		it('should fetch upcoming payments successfully', async () => {
			const mockPayments = [
				{
					id: '1',
					tenantId: 't1',
					tenantName: 'John Doe',
					propertyName: 'Test Property',
					unitNumber: '101',
					amount: 150000,
					dueDate: '2024-02-01T00:00:00.000Z',
					autopayEnabled: true,
					paymentMethodConfigured: true
				}
			]

			vi.mocked(apiRequest.apiRequest).mockResolvedValue({
				success: true,
				payments: mockPayments
			})

			const { result } = renderHook(() => useUpcomingPayments(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data).toEqual(mockPayments)
			expect(result.current.data?.[0]?.tenantName).toBe('John Doe')
		})
	})

	describe('useOverduePayments', () => {
		it('should fetch overdue payments with days calculation', async () => {
			const mockPayments = [
				{
					id: '1',
					tenantId: 't1',
					tenantName: 'Jane Doe',
					tenantEmail: 'jane@test.com',
					propertyName: 'Test Property',
					unitNumber: '102',
					amount: 150000,
					dueDate: '2024-01-01T00:00:00.000Z',
					daysOverdue: 15,
					lateFeeAmount: 7500,
					lateFeeApplied: true
				}
			]

			vi.mocked(apiRequest.apiRequest).mockResolvedValue({
				success: true,
				payments: mockPayments
			})

			const { result } = renderHook(() => useOverduePayments(), {
				wrapper: createWrapper()
			})

			await waitFor(() => expect(result.current.isSuccess).toBe(true))

			expect(result.current.data).toEqual(mockPayments)
			expect(result.current.data?.[0]?.daysOverdue).toBe(15)
			expect(result.current.data?.[0]?.lateFeeApplied).toBe(true)
		})
	})

	describe('useRecordManualPaymentMutation', () => {
		it('should record manual payment successfully', async () => {
			const mockPayment = {
				id: 'p1',
				amount: 150000,
				status: 'succeeded'
			}

			vi.mocked(apiRequest.apiRequest).mockResolvedValue({
				success: true,
				payment: mockPayment
			})

			const { result } = renderHook(() => useRecordManualPaymentMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				lease_id: 'l1',
				tenant_id: 't1',
				amount: 1500,
				payment_method: 'cash',
				paid_date: '2024-01-15'
			})

			expect(apiRequest.apiRequest).toHaveBeenCalledWith(
				'/api/v1/rent-payments/manual',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('lease_id')
				})
			)
		})
	})

	describe('useExportPaymentsMutation', () => {
		it('should call export API with correct URL', async () => {
			const mockBlob = new Blob(['csv,content'], { type: 'text/csv' })
			const mockResponse = {
				blob: () => Promise.resolve(mockBlob)
			}

			vi.mocked(apiRequest.apiRequestRaw).mockResolvedValue(
				mockResponse as Response
			)

			// Mock URL methods without affecting document.createElement
			const originalCreateObjectURL = URL.createObjectURL
			const originalRevokeObjectURL = URL.revokeObjectURL
			URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
			URL.revokeObjectURL = vi.fn()

			const { result } = renderHook(() => useExportPaymentsMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({ status: 'succeeded' })

			expect(apiRequest.apiRequestRaw).toHaveBeenCalledWith(
				'/api/v1/rent-payments/export?status=succeeded'
			)

			// Restore URL methods
			URL.createObjectURL = originalCreateObjectURL
			URL.revokeObjectURL = originalRevokeObjectURL
		})

		it('should call export API with date filters', async () => {
			const mockBlob = new Blob(['csv,content'], { type: 'text/csv' })
			const mockResponse = {
				blob: () => Promise.resolve(mockBlob)
			}

			vi.mocked(apiRequest.apiRequestRaw).mockResolvedValue(
				mockResponse as Response
			)

			const originalCreateObjectURL = URL.createObjectURL
			const originalRevokeObjectURL = URL.revokeObjectURL
			URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
			URL.revokeObjectURL = vi.fn()

			const { result } = renderHook(() => useExportPaymentsMutation(), {
				wrapper: createWrapper()
			})

			await result.current.mutateAsync({
				status: 'all',
				startDate: '2024-01-01',
				endDate: '2024-12-31'
			})

			expect(apiRequest.apiRequestRaw).toHaveBeenCalledWith(
				'/api/v1/rent-payments/export?status=all&startDate=2024-01-01&endDate=2024-12-31'
			)

			URL.createObjectURL = originalCreateObjectURL
			URL.revokeObjectURL = originalRevokeObjectURL
		})
	})
})
