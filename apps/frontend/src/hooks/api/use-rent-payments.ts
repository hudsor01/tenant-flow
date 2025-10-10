/**
 * TanStack Query hooks for rent payments API
 * Phase 6D: One-Time Rent Payment UI
 */
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for rent payments endpoints
 */
export const rentPaymentKeys = {
	all: ['rent-payments'] as const,
	list: () => [...rentPaymentKeys.all, 'list'] as const
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
			const response = await apiClient<{
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
					receipt_url?: string
				}
			}>(`${API_BASE_URL}/api/v1/rent-payments`, {
				method: 'POST',
				body: JSON.stringify(params)
			})

			return {
				...response,
				paymentIntent: {
					...response.paymentIntent,
					receiptUrl:
						response.paymentIntent.receiptUrl ??
						response.paymentIntent.receipt_url
				}
			}
		},
		onSuccess: res => {
			if (res?.payment) {
				queryClient.setQueryData<
					import('@repo/shared/types/core').RentPayment[] | undefined
				>(rentPaymentKeys.list(), old =>
					old
						? [
								res.payment as import('@repo/shared/types/core').RentPayment,
								...old
							]
						: [res.payment as import('@repo/shared/types/core').RentPayment]
				)
			}
		}
	})
}
