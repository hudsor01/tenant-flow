/**
 * Payment Methods Hooks
 * TanStack Query hooks for tenant payment method management
 *
 * All operations use Supabase PostgREST directly — no apiRequest calls.
 * payment_methods table: id, stripe_payment_method_id, tenant_id, type,
 *   brand, last_four, exp_month, exp_year, bank_name, is_default, created_at
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

// ============================================================================
// TYPES
// ============================================================================

/**
 * PaymentMethod shape matching the payment_methods DB table.
 * Uses last_four (DB column name) — not the Stripe API's last4.
 */
export interface PaymentMethod {
	id: string
	stripe_payment_method_id: string
	type: string
	brand: string | null
	last_four: string | null
	exp_month: number | null
	exp_year: number | null
	bank_name: string | null
	is_default: boolean | null
	created_at: string | null
}

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
// QUERY OPTIONS
// ============================================================================

export const paymentMethodsQueries = {
	list: () =>
		queryOptions({
			queryKey: paymentMethodsKeys.list(),
			queryFn: async (): Promise<PaymentMethod[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('payment_methods')
					.select(
						'id, stripe_payment_method_id, type, brand, last_four, exp_month, exp_year, bank_name, is_default, created_at'
					)
					.order('created_at', { ascending: false })
				if (error) handlePostgrestError(error, 'payment_methods')
				return (data ?? []) as PaymentMethod[]
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
		mutationKey: ['mutations', 'paymentMethods', 'setDefault'] as const,
		mutationFn: async (
			paymentMethodId: string
		): Promise<{ success: boolean }> => {
			const supabase = createClient()
			// Get current user
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			// Get tenant record to resolve tenant_id
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()
			if (tenantError) handlePostgrestError(tenantError, 'tenants')
			if (!tenant) throw new Error('Tenant record not found')

			// Clear all defaults for this tenant
			const { error: clearError } = await supabase
				.from('payment_methods')
				.update({ is_default: false })
				.eq('tenant_id', tenant.id)
			if (clearError) handlePostgrestError(clearError, 'payment_methods')

			// Set new default
			const { error } = await supabase
				.from('payment_methods')
				.update({ is_default: true })
				.eq('id', paymentMethodId)
			if (error) handlePostgrestError(error, 'payment_methods')

			return { success: true }
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
		): Promise<PaymentMethod> => {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			// Resolve tenant_id from user
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()
			if (tenantError) handlePostgrestError(tenantError, 'tenants')
			if (!tenant) throw new Error('Tenant record not found')

			// Check if this is the first card — if so, set as default
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
			return data as PaymentMethod
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: paymentMethodsKeys.all })
			handleMutationSuccess('Add payment method', 'Payment method added')
		},
		onError: error => handleMutationError(error, 'Add payment method')
	})
}
