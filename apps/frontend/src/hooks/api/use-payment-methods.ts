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
import { API_BASE_URL } from '@/lib/api-client'

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
 * Hook to save payment method after SetupIntent confirmation
 */
export function useSavePaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (request: { paymentMethodId: string }) => {
			return await apiClient<{ success: boolean }>(
				`${API_BASE_URL}/api/v1/payment-methods/save`,
				{
					method: 'POST',
					body: JSON.stringify(request)
				}
			)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentMethodKeys.list() })
		}
	})
}

/**
 * Hook to set default payment method
 */
export function useSetDefaultPaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean },
		unknown,
		string,
		{ previous?: PaymentMethodResponse[] }
	>({
		mutationFn: async (paymentMethodId: string) => {
			return await apiClient<{ success: boolean }>(
				`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}/default`,
				{
					method: 'PATCH'
				}
			)
		},
		onMutate: async (
			paymentMethodId: string
		): Promise<{
			previous?: PaymentMethodResponse[]
		}> => {
			await queryClient.cancelQueries({ queryKey: paymentMethodKeys.list() })
			const previous = queryClient.getQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list()
			)
			// Optimistically mark selected method as default and unset others
			queryClient.setQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list(),
				old =>
					old
						? old.map(m => ({ ...m, isDefault: m.id === paymentMethodId }))
						: old
			)
			return previous ? { previous } : {}
		},
		onError: (
			_err: unknown,
			_paymentMethodId: string,
			context?: {
				previous?: PaymentMethodResponse[]
			}
		) => {
			if (context?.previous) {
				queryClient.setQueryData(paymentMethodKeys.list(), context.previous)
			}
		},
		onSuccess: () => {
			// UI feedback only; cache already updated optimistically
			// Keep network refetch off to reduce extra GETs; server reconciliation
			// will occur on background refetch according to staleTime.
		}
	})
}

/**
 * Hook to delete payment method
 */
export function useDeletePaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean },
		unknown,
		string,
		{ previous?: PaymentMethodResponse[] }
	>({
		mutationFn: async (paymentMethodId: string) => {
			return await apiClient<{ success: boolean }>(
				`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}`,
				{
					method: 'DELETE'
				}
			)
		},
		onMutate: async (
			paymentMethodId: string
		): Promise<{
			previous?: PaymentMethodResponse[]
		}> => {
			await queryClient.cancelQueries({ queryKey: paymentMethodKeys.list() })
			const previous = queryClient.getQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list()
			)
			queryClient.setQueryData<PaymentMethodResponse[]>(
				paymentMethodKeys.list(),
				old => (old ? old.filter(m => m.id !== paymentMethodId) : old)
			)
			return previous ? { previous } : {}
		},
		onError: (
			_err: unknown,
			_paymentMethodId: string,
			context?: {
				previous?: PaymentMethodResponse[]
			}
		) => {
			if (context?.previous) {
				queryClient.setQueryData(paymentMethodKeys.list(), context.previous)
			}
		},
		onSuccess: () => {
			// UI feedback only; cache updated optimistically
		}
	})
}

/**
 * Hook for prefetching payment methods
 */
export function usePrefetchPaymentMethods() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: paymentMethodKeys.list(),
			queryFn: async () => {
				const response = await apiClient<{
					paymentMethods: PaymentMethodResponse[]
				}>(`${API_BASE_URL}/api/v1/payment-methods`)
				return response.paymentMethods
			},
			staleTime: 5 * 60 * 1000
		})
	}
}
