/**
 * TanStack Query hooks for rent payments API
 * Phase 6D: One-Time Rent Payment UI
 * Task 2.4: Payment Status Tracking
 */
import { clientFetch } from '#lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Query keys for rent payments endpoints
 */
export const rentPaymentKeys = {
	all: ['rent-payments'] as const,
	list: () => [...rentPaymentKeys.all, 'list'] as const,
	status: (tenantId: string) =>
		[...rentPaymentKeys.all, 'status', tenantId] as const
}

/**
 * Hook to create a one-time rent payment
 * Uses saved payment method to charge tenant immediately
 */
export function useCreateRentPayment() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: {
			tenantId: string
			leaseId: string
			amount: number
			paymentMethodId: string
		}) => {
			const response = await clientFetch<{
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
			const previousList = queryClient.getQueryData<
				import('@repo/shared/types/core').RentPayment[] | undefined
			>(rentPaymentKeys.list())

			// Create optimistic payment entry (partial - will be replaced by server response)
			const tempId = `temp-${Date.now()}`
			const optimisticPayment = {
				id: tempId,
				amount: newPayment.amount,
				status: 'processing',
				tenantId: newPayment.tenantId,
				leaseId: newPayment.leaseId,
				ownerId: '',
				ownerReceives: 0,
				platformFee: 0,
				stripeFee: 0,
				paymentType: 'stripe',
				lateFeeAmount: null,
				lateFeeApplied: null,
				lateFeeAppliedAt: null,
				stripePaymentIntentId: null,
				stripeInvoiceId: null,
				subscriptionId: null,
				dueDate: null,
				paidAt: null,
				failureReason: null,
				createdAt: new Date().toISOString()
			} as import('@repo/shared/types/core').RentPayment

			// Optimistically update cache
			queryClient.setQueryData<
				import('@repo/shared/types/core').RentPayment[] | undefined
			>(rentPaymentKeys.list(), old =>
				old ? [optimisticPayment, ...old] : [optimisticPayment]
			)

			return { previousList, tempId }
		},
		onError: (_err, _variables, context) => {
			// Rollback on error
			if (context?.previousList) {
				queryClient.setQueryData(rentPaymentKeys.list(), context.previousList)
			}
		},
		onSuccess: (res, _variables, context) => {
			if (res?.payment) {
				// Replace optimistic entry with real data
				queryClient.setQueryData<
					import('@repo/shared/types/core').RentPayment[] | undefined
				>(rentPaymentKeys.list(), old =>
					old
						? old.map(p =>
								p.id === context?.tempId
									? (res.payment as import('@repo/shared/types/core').RentPayment)
									: p
							)
						: [res.payment as import('@repo/shared/types/core').RentPayment]
				)
			}
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: rentPaymentKeys.list() })
		}
	})
}

/**
 * Payment status response type
 * Task 2.4: Payment Status Tracking
 */
export interface PaymentStatus {
	status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING'
	rentAmount: number
	nextDueDate: string | null
	lastPaymentDate: string | null
	outstandingBalance: number
	isOverdue: boolean
}

/**
 * Hook to get current payment status for a tenant
 * Returns real-time payment status from backend
 * Task 2.4: Payment Status Tracking
 */
export function usePaymentStatus(tenantId: string) {
	return useQuery({
		queryKey: rentPaymentKeys.status(tenantId),
		queryFn: () =>
			clientFetch<PaymentStatus>(`/api/v1/rent-payments/status/${tenantId}`),
		enabled: !!tenantId,
		staleTime: 1 * 60 * 1000, // 1 minute (payment status can change)
		retry: 2
	})
}
