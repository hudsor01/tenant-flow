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
	owner: (tenant_id: string) => ['tenantPayments', 'owner', tenant_id] as const,
	self: () => ['tenantPayments', 'self'] as const
}

interface PaymentQueryOptions {
	limit?: number
	enabled?: boolean
}

export function useOwnerTenantPayments(
	tenant_id: string,
	options?: PaymentQueryOptions
) {
	const limit = options?.limit ?? 20

	return useQuery({
		queryKey: [...tenantPaymentKeys.owner(tenant_id), limit],
		queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
			const response = await clientFetch<TenantPaymentHistoryResponse>(
				`/api/v1/tenants/${tenant_id}/payments?limit=${limit}`
			)
			return response
		},
		...QUERY_CACHE_TIMES.DETAIL,
		enabled: options?.enabled ?? Boolean(tenant_id)
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
			} else if (variables?.request.tenant_id) {
				queryClient.invalidateQueries({
					queryKey: tenantPaymentKeys.owner(variables.request.tenant_id)
				})
			}
		}
	})
}
