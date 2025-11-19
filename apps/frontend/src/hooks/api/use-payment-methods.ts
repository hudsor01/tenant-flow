/**
 * TanStack Query hooks for payment methods API
 * Phase 3: Frontend Integration for Tenant Payment System
 */
import { clientFetch } from '#lib/api/client'
import type { PaymentMethodResponse, PaymentMethodResponseWithVersion } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { incrementVersion } from '@repo/shared/utils/optimistic-locking'

/**
 * Query keys for payment methods endpoints
 */
export const paymentMethodKeys = {
	all: ['paymentMethods'] as const,
	list: () => [...paymentMethodKeys.all, 'list'] as const
}

/**
 * Hook to fetch tenant payment methods (Phase 4: Stripe API integration)
 */
export function usePaymentMethods() {
	return useQuery({
		queryKey: paymentMethodKeys.list(),
		queryFn: async (): Promise<PaymentMethodResponse[]> => {
			const response = await clientFetch<{
				payment_methods: PaymentMethodResponse[]
			}>('/api/v1/stripe/tenant-payment-methods')
			// Backend now returns proper PaymentMethodResponse structure
			return response.payment_methods
		},
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 2
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
		mutationFn: async (
			paymentMethodId: string
		): Promise<{ success: boolean }> => {
			return clientFetch<{ success: boolean }>(
				`/api/v1/payment-methods/${paymentMethodId}/default`,
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
		queryClient.setQueryData<PaymentMethodResponseWithVersion[]>(
			paymentMethodKeys.list(),
			(old: PaymentMethodResponseWithVersion[] | undefined) =>
				old
					? old.map((m: PaymentMethodResponseWithVersion) =>
							incrementVersion(m, {
								isDefault: m.id === paymentMethodId
							})
						)
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
 * Hook to delete tenant payment method (Phase 4: Stripe detach)
 */
export function useDeletePaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation<
		{ success: boolean; message?: string },
		unknown,
		string,
		{ previous?: PaymentMethodResponse[] }
	>({
		mutationFn: async (
			paymentMethodId: string
		): Promise<{
			success: boolean
			message?: string
		}> => {
			return clientFetch<{
				success: boolean
				message?: string
			}>(`/api/v1/stripe/tenant-payment-methods/${paymentMethodId}`, {
				method: 'DELETE'
			})
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
				(old: PaymentMethodResponse[] | undefined) =>
					old
						? old.filter((m: PaymentMethodResponse) => m.id !== paymentMethodId)
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
			queryFn: async (): Promise<PaymentMethodResponse[]> => {
				const response = await clientFetch<{
					paymentMethods: PaymentMethodResponse[]
				}>('/api/v1/payment-methods')
				return response.paymentMethods
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}
