'use client'

/**
 * Tenant Autopay Hooks
 * Autopay status queries and toggle mutations for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { DEFAULT_RETRY_ATTEMPTS } from '#types/api-contracts'
import { tenantPortalKeys, resolveTenantId } from './use-tenant-portal-keys'

// ============================================================================
// TYPES
// ============================================================================

export interface TenantAutopayStatus {
	autopayEnabled: boolean
	subscriptionId: string | null
	subscriptionStatus?: string | null
	lease_id?: string
	tenant_id?: string
	rent_amount?: number
	nextPaymentDate?: string | null
	paymentMethodId?: string | null
	paymentMethodLast4?: string | null
	paymentMethodBrand?: string | null
	message?: string
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const tenantAutopayQueries = {
	autopay: () =>
		queryOptions({
			queryKey: tenantPortalKeys.autopay.all(),
			queryFn: async (): Promise<TenantAutopayStatus> => {
				const supabase = createClient()

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId) {
					return { autopayEnabled: false, subscriptionId: null }
				}

				const { data: lease } = await supabase
					.from('leases')
					.select('id, auto_pay_enabled, autopay_payment_method_id, stripe_subscription_id, rent_amount, payment_day, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantId)
					.eq('lease_status', 'active')
					.single()

				if (!lease) {
					return { autopayEnabled: false, subscriptionId: null }
				}

				const pmId = lease.autopay_payment_method_id as string | null
				let paymentMethodLast4: string | null = null
				let paymentMethodBrand: string | null = null

				if (pmId) {
					const { data: pm } = await supabase
						.from('payment_methods')
						.select('last_four, brand')
						.eq('stripe_payment_method_id', pmId)
						.maybeSingle()
					paymentMethodLast4 = pm?.last_four ?? null
					paymentMethodBrand = pm?.brand ?? null
				}

				const now = new Date()
				const paymentDay = (lease.payment_day as number) || 1
				let nextDate = new Date(now.getFullYear(), now.getMonth(), paymentDay)
				if (nextDate <= now) {
					nextDate = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay)
				}

				const nextPaymentDate = nextDate.toISOString().slice(0, 10)

				return {
					autopayEnabled: !!lease.auto_pay_enabled,
					subscriptionId: lease.stripe_subscription_id,
					lease_id: lease.id,
					tenant_id: tenantId,
					rent_amount: lease.rent_amount,
					nextPaymentDate,
					paymentMethodId: pmId,
					paymentMethodLast4,
					paymentMethodBrand,
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: DEFAULT_RETRY_ATTEMPTS
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useTenantAutopayStatus() {
	return useQuery(tenantAutopayQueries.autopay())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Toggle autopay via toggle_autopay RPC (PAY-03).
 */
export function useToggleAutopay() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantAutopay.setup,
		mutationFn: async (params: {
			lease_id: string
			enabled: boolean
			payment_method_id?: string | null
		}) => {
			const supabase = createClient()

			const { error } = await supabase.rpc('toggle_autopay', {
				p_lease_id: params.lease_id,
				p_enabled: params.enabled,
				p_payment_method_id: params.payment_method_id ?? null
			})

			if (error) handlePostgrestError(error, 'toggle_autopay')
			return { success: true }
		},
		onSuccess: (_data, params) => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.leases.all()
			})
			const message = params.enabled
				? 'Autopay has been enabled'
				: 'Autopay has been disabled'
			handleMutationSuccess(
				params.enabled ? 'Enable autopay' : 'Disable autopay',
				message
			)
		},
		onError: (error) => handleMutationError(error, 'Toggle autopay')
	})
}

/**
 * Enable autopay for tenant's lease via toggle_autopay RPC.
 * Wrapper around useToggleAutopay for backward compatibility.
 */
export function useTenantPortalSetupAutopayMutation() {
	const toggleAutopay = useToggleAutopay()

	return {
		...toggleAutopay,
		mutate: (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}, options?: Parameters<typeof toggleAutopay.mutate>[1]) => {
			toggleAutopay.mutate({
				lease_id: params.lease_id,
				enabled: true,
				payment_method_id: params.paymentMethodId ?? null
			}, options)
		},
		mutateAsync: async (params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			return toggleAutopay.mutateAsync({
				lease_id: params.lease_id,
				enabled: true,
				payment_method_id: params.paymentMethodId ?? null
			})
		}
	}
}

/**
 * Disable autopay for tenant's lease via toggle_autopay RPC.
 * Wrapper around useToggleAutopay for backward compatibility.
 */
export function useTenantPortalCancelAutopayMutation() {
	const toggleAutopay = useToggleAutopay()

	return {
		...toggleAutopay,
		mutate: (params: {
			tenant_id: string
			lease_id: string
		}, options?: Parameters<typeof toggleAutopay.mutate>[1]) => {
			toggleAutopay.mutate({
				lease_id: params.lease_id,
				enabled: false,
				payment_method_id: null
			}, options)
		},
		mutateAsync: async (params: {
			tenant_id: string
			lease_id: string
		}) => {
			return toggleAutopay.mutateAsync({
				lease_id: params.lease_id,
				enabled: false,
				payment_method_id: null
			})
		}
	}
}
