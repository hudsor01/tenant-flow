/**
 * TanStack Query hooks for rent payments API
 * Phase 6D: One-Time Rent Payment UI
 * Task 2.4: Payment Status Tracking
 */
import { apiRequest } from '#lib/api-request'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	RentPayment,
	TenantPaymentStatusResponse
} from '@repo/shared/types/api-contracts'

/**
 * Query keys for rent payments endpoints
 */
export const rentPaymentKeys = {
	all: ['rent-payments'] as const,
	list: () => [...rentPaymentKeys.all, 'list'] as const,
	status: (tenant_id: string) =>
		[...rentPaymentKeys.all, 'status', tenant_id] as const
}

/**
 * Hook to create a one-time rent payment
 * Uses saved payment method to charge tenant immediately
 */
export function useCreateRentPayment() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			amount: number
			paymentMethodId: string
		}) => {
			const response = await apiRequest<{
				success: boolean
				payment: {
					id: string
					amount: number
					status: string
					stripePaymentIntentId: string
				}
				paymentIntent: {
					id: string
					status: string
					receiptUrl?: string
				}
			}>('/api/v1/rent-payments', {
				method: 'POST',
				body: JSON.stringify(params)
			})

			return {
				...response,
				paymentIntent: {
					...response.paymentIntent,
					receiptUrl: response.paymentIntent.receiptUrl
				}
			}
		},
		onMutate: async newPayment => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: rentPaymentKeys.list() })

			// Snapshot previous state
			const previousList = queryClient.getQueryData<RentPayment[] | undefined>(
				rentPaymentKeys.list()
			)

			// Create optimistic payment entry (partial - will be replaced by server response)
			const tempId = `temp-${Date.now()}`
			const today = new Date().toISOString().split('T')[0] ?? ''
			const optimisticPayment: RentPayment = {
				id: tempId,
				amount: newPayment.amount,
				status: 'pending',
				tenant_id: newPayment.tenant_id,
				lease_id: newPayment.lease_id,
				stripe_payment_intent_id: '',
				application_fee_amount: 0,
				late_fee_amount: null,
				payment_method_type: 'stripe',
				period_start: today,
				period_end: today,
				due_date: today,
				paid_date: null,
				currency: 'USD',
				created_at: new Date().toISOString(),
				updated_at: null
			}

			// Optimistically update cache
			queryClient.setQueryData<RentPayment[] | undefined>(
				rentPaymentKeys.list(),
				old => (old ? [optimisticPayment, ...old] : [optimisticPayment])
			)

			return { previousList, tempId }
		},
		onError: (_err, _variables, context) => {
			// Rollback on error
			if (context?.previousList) {
				queryClient.setQueryData(rentPaymentKeys.list(), context.previousList)
			}
		},
		onSuccess: (_res, _variables, _context) => {
			// The API returns a partial payment object, so we rely on onSettled
			// to refetch the full list with proper RentPayment types
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: rentPaymentKeys.list() })
		}
	})
}

/**
 * Hook to get current payment status for a tenant
 * Returns real-time payment status from backend
 * Task 2.4: Payment Status Tracking
 */
export function usePaymentStatus(tenant_id: string) {
	return useQuery({
		queryKey: rentPaymentKeys.status(tenant_id),
		queryFn: () =>
			apiRequest<TenantPaymentStatusResponse>(
				`/api/v1/rent-payments/status/${tenant_id}`
			),
		enabled: !!tenant_id,
		...QUERY_CACHE_TIMES.STATS, // Payment status can change
		retry: 2
	})
}
