/**
 * TanStack Query hooks for payment methods API
 * Phase 3: Frontend Integration for Tenant Payment System
 */
import type {
	CreateSetupIntentRequest,
	PaymentMethodResponse,
	PaymentMethodSetupIntent
} from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for payment methods endpoints
 */
export const paymentMethodKeys = {
	all: ['paymentMethods'] as const,
	list: () => [...paymentMethodKeys.all, 'list'] as const,
	setupIntent: (type: 'card' | 'us_bank_account') =>
		[...paymentMethodKeys.all, 'setupIntent', type] as const
}

/**
 * Hook to fetch user's payment methods
 */
export function usePaymentMethods() {
	return useQuery({
		queryKey: paymentMethodKeys.list(),
		queryFn: async () => {
			const response = await apiClient<{
				paymentMethods: PaymentMethodResponse[]
			}>(`${API_BASE_URL}/api/v1/payment-methods`)
			return response.paymentMethods
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

/**
 * Hook to create a setup intent for adding payment methods
 */
export function useCreateSetupIntent() {
	return useMutation({
		mutationFn: async (request: CreateSetupIntentRequest) => {
			return await apiClient<PaymentMethodSetupIntent>(
				`${API_BASE_URL}/api/v1/payment-methods/setup-intent`,
				{
					method: 'POST',
					body: JSON.stringify(request)
				}
			)
		}
	})
}

/**
 * Hook to set default payment method
 */
export function useSetDefaultPaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (paymentMethodId: string) => {
			return await apiClient<{ success: boolean }>(
				`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}/default`,
				{
					method: 'PATCH'
				}
			)
		},
		onSuccess: () => {
			// Invalidate payment methods list to refetch with updated default
			queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() })
		}
	})
}

/**
 * Hook to delete payment method
 */
export function useDeletePaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (paymentMethodId: string) => {
			return await apiClient<{ success: boolean }>(
				`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}`,
				{
					method: 'DELETE'
				}
			)
		},
		onSuccess: () => {
			// Invalidate payment methods list to refetch without deleted method
			queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() })
		}
	})
}
