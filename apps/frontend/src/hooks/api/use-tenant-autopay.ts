'use client'

import { clientFetch } from '#lib/api/client'
import { tenantPortalKeys } from '#hooks/api/use-tenant-portal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useTenantPortalSetupAutopay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: { tenantId: string; leaseId: string; paymentMethodId?: string }) => {
			return clientFetch('/api/v1/rent-payments/autopay/setup', {
				method: 'POST',
				body: JSON.stringify(params)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}

export function useTenantPortalCancelAutopay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: { tenantId: string; leaseId: string; paymentMethodId?: string }) => {
			return clientFetch('/api/v1/rent-payments/autopay/cancel', {
				method: 'POST',
				body: JSON.stringify(params)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}
