/**
 * Payment Methods Hooks
 * TanStack Query hooks for tenant payment method management
 *
 * Endpoints:
 * - GET /api/v1/stripe/payment-methods
 * - DELETE /api/v1/stripe/payment-methods/:id
 * - POST /api/v1/stripe/payment-methods/:id/set-default
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentMethod {
	id: string
	type: 'card' | 'us_bank_account'
	is_default: boolean
	card?: {
		brand: string
		last4: string
		exp_month: number
		exp_year: number
	}
	us_bank_account?: {
		bank_name: string
		last4: string
		account_type: 'checking' | 'savings'
	}
	created: number
}

interface PaymentMethodsResponse {
	paymentMethods: PaymentMethod[]
}

interface SetDefaultResponse {
	success: boolean
	message?: string
}

interface DeleteResponse {
	success: boolean
	message?: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentMethodsKeys = {
	all: ['payment-methods'] as const,
	list: () => [...paymentMethodsKeys.all, 'list'] as const
}

// ============================================================================
// MUTATION KEYS
// ============================================================================

export const paymentMethodsMutationKeys = {
	delete: ['mutations', 'paymentMethods', 'delete'] as const,
	setDefault: ['mutations', 'paymentMethods', 'setDefault'] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const paymentMethodsQueries = {
	list: () =>
		queryOptions({
			queryKey: paymentMethodsKeys.list(),
			queryFn: async (): Promise<PaymentMethod[]> => {
				const response = await apiRequest<PaymentMethodsResponse>(
					'/api/v1/stripe/payment-methods'
				)
				return response.paymentMethods
			},
			staleTime: 60 * 1000
		})
}

// ============================================================================
// HOOKS
// ============================================================================

export function usePaymentMethods() {
	return useQuery(paymentMethodsQueries.list())
}

export function useDeletePaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: paymentMethodsMutationKeys.delete,
		mutationFn: async (paymentMethodId: string): Promise<DeleteResponse> => {
			return apiRequest<DeleteResponse>(
				`/api/v1/stripe/payment-methods/${paymentMethodId}`,
				{ method: 'DELETE' }
			)
		},
		onSuccess: (_data, paymentMethodId) => {
			queryClient.setQueryData<PaymentMethod[] | undefined>(
				paymentMethodsKeys.list(),
				old => (old ? old.filter(pm => pm.id !== paymentMethodId) : old)
			)
			handleMutationSuccess(
				'Remove payment method',
				'Payment method has been removed'
			)
		},
		onError: error => handleMutationError(error, 'Remove payment method')
	})
}

export function useSetDefaultPaymentMethod() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: paymentMethodsMutationKeys.setDefault,
		mutationFn: async (
			paymentMethodId: string
		): Promise<SetDefaultResponse> => {
			return apiRequest<SetDefaultResponse>(
				`/api/v1/stripe/payment-methods/${paymentMethodId}/set-default`,
				{ method: 'POST' }
			)
		},
		onSuccess: (_data, paymentMethodId) => {
			queryClient.setQueryData<PaymentMethod[] | undefined>(
				paymentMethodsKeys.list(),
				old =>
					old
						? old.map(pm => ({
								...pm,
								is_default: pm.id === paymentMethodId
							}))
						: old
			)
			handleMutationSuccess(
				'Set default payment method',
				'Default payment method updated'
			)
		},
		onError: error => handleMutationError(error, 'Set default payment method')
	})
}
