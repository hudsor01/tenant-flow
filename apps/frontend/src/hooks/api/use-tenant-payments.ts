'use client'

import { clientFetch } from '#lib/api/client'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	SendPaymentReminderRequest,
	SendPaymentReminderResponse,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'

export const tenantPaymentKeys = {
	owner: (tenantId: string) => ['tenantPayments', 'owner', tenantId] as const,
	self: () => ['tenantPayments', 'self'] as const
}

interface PaymentQueryOptions {
	limit?: number
	enabled?: boolean
}

export function useOwnerTenantPayments(
	tenantId: string,
	options?: PaymentQueryOptions
) {
	const limit = options?.limit ?? 20

	return useQuery({
		queryKey: [...tenantPaymentKeys.owner(tenantId), limit],
		queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
			const response = await clientFetch<TenantPaymentHistoryResponse>(
				`/api/v1/tenants/${tenantId}/payments?limit=${limit}`
			)
			return response
		},
		...QUERY_CACHE_TIMES.DETAIL,
		enabled: options?.enabled ?? Boolean(tenantId)
	})
}

export function useTenantPaymentsHistory(options?: PaymentQueryOptions) {
	const limit = options?.limit ?? 20

	return useQuery({
		queryKey: [...tenantPaymentKeys.self(), limit],
		queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
			return clientFetch<TenantPaymentHistoryResponse>(
				`/api/v1/tenants/me/payments?limit=${limit}`
			)
		},
		...QUERY_CACHE_TIMES.DETAIL,
		enabled: options?.enabled ?? true
	})
}

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

export function useSendTenantPaymentReminder() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ request }: SendReminderVariables) => {
			return clientFetch<SendPaymentReminderResponse>('/api/v1/tenants/payments/reminders', {
				method: 'POST',
				body: JSON.stringify(request)
			})
		},
		onSuccess: (_data, variables) => {
			if (variables?.ownerQueryKey) {
				queryClient.invalidateQueries({
					queryKey: variables.ownerQueryKey
				})
			} else if (variables?.request.tenantId) {
				queryClient.invalidateQueries({
					queryKey: tenantPaymentKeys.owner(variables.request.tenantId)
				})
			}
		}
	})
}
