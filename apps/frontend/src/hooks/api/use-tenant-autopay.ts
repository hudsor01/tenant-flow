'use client'

import { apiRequest } from '#lib/api-request'

import { tenantPortalKeys } from './use-tenant-portal'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useTenantPortalSetupAutopay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			return apiRequest('/api/v1/rent-payments/autopay/setup', {
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
		mutationFn: async (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			return apiRequest('/api/v1/rent-payments/autopay/cancel', {
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
