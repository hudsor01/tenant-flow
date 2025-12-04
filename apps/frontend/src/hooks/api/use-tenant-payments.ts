import { apiRequest } from '#lib/api-request'
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type {
	SendPaymentReminderRequest,
	SendPaymentReminderResponse
} from '@repo/shared/types/api-contracts'
import { tenantPaymentQueries, tenantPaymentKeys } from './queries/tenant-payment-queries'

interface PaymentQueryOptions {
	limit?: number
	enabled?: boolean
}


export function useOwnerTenantPayments(
	tenant_id: string,
	options?: PaymentQueryOptions
) {
	return useQuery(tenantPaymentQueries.ownerPayments(tenant_id, options))
}

export function useTenantPaymentsHistory(options?: PaymentQueryOptions) {
	return useQuery(tenantPaymentQueries.selfPayments(options))
}

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

export function useSendTenantPaymentReminder() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ request }: SendReminderVariables) => {
			return apiRequest<SendPaymentReminderResponse>('/api/v1/tenants/payments/reminders', {
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

// Re-export query keys for backward compatibility
export { tenantPaymentKeys } from './queries/tenant-payment-queries'
