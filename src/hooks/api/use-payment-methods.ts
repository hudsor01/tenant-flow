/**
 * Payment Methods Hooks — Canonical Module
 * TanStack Query hooks for tenant payment method management
 *
 * All operations use Supabase PostgREST directly — no apiRequest calls.
 * payment_methods table: id, stripe_payment_method_id, tenant_id, type,
 *   brand, last_four, exp_month, exp_year, bank_name, is_default, created_at
 *
 * Returns PaymentMethodResponse (camelCase) from shared types to match
 * all consumer expectations.
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import type { PaymentMethodResponse } from '#shared/types/core'

// ============================================================================
// TYPES
// ============================================================================

export interface AddPaymentMethodInput {
	stripe_payment_method_id: string
	type: string
	brand?: string
	last_four?: string
	exp_month?: number
	exp_year?: number
	bank_name?: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentMethodsKeys = {
	all: ['payment-methods'] as const,
	list: () => [...paymentMethodsKeys.all, 'list'] as const
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map DB row (snake_case) to PaymentMethodResponse (camelCase).
 */
function mapToResponse(row: Record<string, unknown>): PaymentMethodResponse {
	return {
		id: row.id as string,
		tenantId: '',
		stripePaymentMethodId: row.stripe_payment_method_id as string,
		type: row.type as PaymentMethodResponse['type'],
		last4: row.last_four as string | null,
		brand: row.brand as string | null,
		bankName: row.bank_name as string | null,
		isDefault: (row.is_default as boolean | null) ?? false,
		createdAt: (row.created_at as string | null) ?? ''
	}
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const paymentMethodsQueries = {
	list: () =>
		queryOptions({
			queryKey: paymentMethodsKeys.list(),
			queryFn: async (): Promise<PaymentMethodResponse[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('payment_methods')
					.select(
						'id, stripe_payment_method_id, type, brand, last_four, exp_month, exp_year, bank_name, is_default, created_at'
					)
					.order('created_at', { ascending: false })
				if (error) handlePostgrestError(error, 'payment_methods')
				return (data ?? []).map(row => mapToResponse(row as Record<string, unknown>))
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
		mutationKey: ['mutations', 'paymentMethods', 'delete'] as const,
		mutationFn: async (
			paymentMethodId: string
		): Promise<{ success: boolean }> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('payment_methods')
				.delete()
				.eq('id', paymentMethodId)
			if (error) handlePostgrestError(error, 'payment_methods')
			return { success: true }
		},
		onSuccess: (_data, paymentMethodId) => {
			queryClient.setQueryData<PaymentMethodResponse[] | undefined>(
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
		mutationKey: ['mutations', 'paymentMethods', 'setDefault'] as const,
		mutationFn: async (
			paymentMethodId: string
		): Promise<{ success: boolean }> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()
			if (tenantError) handlePostgrestError(tenantError, 'tenants')
			if (!tenant) throw new Error('Tenant record not found')

			const { error: clearError } = await supabase
				.from('payment_methods')
				.update({ is_default: false })
				.eq('tenant_id', tenant.id)
			if (clearError) handlePostgrestError(clearError, 'payment_methods')

			const { error } = await supabase
				.from('payment_methods')
				.update({ is_default: true })
				.eq('id', paymentMethodId)
			if (error) handlePostgrestError(error, 'payment_methods')

			return { success: true }
		},
		onSuccess: (_data, paymentMethodId) => {
			queryClient.setQueryData<PaymentMethodResponse[] | undefined>(
				paymentMethodsKeys.list(),
				old =>
					old
						? old.map(pm => ({
								...pm,
								isDefault: pm.id === paymentMethodId
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

/**
 * Add a payment method after SetupIntent confirmation via React Stripe.js Elements.
 * Inserts a record into payment_methods.
 * Sets is_default=true if this is the tenant's first payment method.
 */
export function useAddPaymentMethodMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.paymentMethods.add,
		mutationFn: async (
			input: AddPaymentMethodInput
		): Promise<PaymentMethodResponse> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()
			if (tenantError) handlePostgrestError(tenantError, 'tenants')
			if (!tenant) throw new Error('Tenant record not found')

			const { count, error: countError } = await supabase
				.from('payment_methods')
				.select('id', { count: 'exact', head: true })
				.eq('tenant_id', tenant.id)
			if (countError) handlePostgrestError(countError, 'payment_methods')
			const isFirst = (count ?? 0) === 0

			const { data, error } = await supabase
				.from('payment_methods')
				.insert({
					stripe_payment_method_id: input.stripe_payment_method_id,
					tenant_id: tenant.id,
					type: input.type,
					brand: input.brand ?? null,
					last_four: input.last_four ?? null,
					exp_month: input.exp_month ?? null,
					exp_year: input.exp_year ?? null,
					bank_name: input.bank_name ?? null,
					is_default: isFirst
				})
				.select(
					'id, stripe_payment_method_id, type, brand, last_four, exp_month, exp_year, bank_name, is_default, created_at'
				)
				.single()
			if (error) handlePostgrestError(error, 'payment_methods')
			return mapToResponse(data as Record<string, unknown>)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentMethodsKeys.all })
			handleMutationSuccess('Add payment method', 'Payment method added')
		},
		onError: error => handleMutationError(error, 'Add payment method')
	})
}
