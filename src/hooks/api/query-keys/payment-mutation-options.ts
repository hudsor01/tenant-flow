/**
 * Payment Mutation Options
 * mutationOptions() factories for payment-related domains:
 * rent collection, rent payments, payment methods, tenant autopay.
 *
 * Factories contain ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled remain in the hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { mutationKeys } from '../mutation-keys'
import type {
	SendPaymentReminderRequest,
	SendPaymentReminderResponse
} from '#types/api-contracts'
import type {
	PaymentFilters,
	ManualPaymentInput
} from '#types/sections/payments'
import type { PaymentMethodResponse } from '#types/core'
import type { QueryKey } from '@tanstack/react-query'

// ============================================================================
// TYPES (used by factories only)
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

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function rowsToCsv(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return ''
	const headers = Object.keys(rows[0] as Record<string, unknown>)
	const headerRow = headers.join(',')
	const dataRows = rows.map(row =>
		headers
			.map(h => {
				const val = (row as Record<string, unknown>)[h]
				const str = val === null || val === undefined ? '' : String(val)
				return str.includes(',') || str.includes('"') || str.includes('\n')
					? `"${str.replace(/"/g, '""')}"`
					: str
			})
			.join(',')
	)
	return [headerRow, ...dataRows].join('\n')
}

function mapToPaymentMethodResponse(row: Record<string, unknown>): PaymentMethodResponse {
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
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const paymentMutations = {
	recordManual: () =>
		mutationOptions({
			mutationKey: mutationKeys.rentCollection.recordManual,
			mutationFn: async (input: ManualPaymentInput): Promise<{ success: boolean; payment: unknown }> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('rent_payments')
					.insert({
						tenant_id: input.tenant_id,
						lease_id: input.lease_id,
						amount: input.amount,
						currency: 'USD',
						status: 'succeeded',
						payment_method_type: input.payment_method ?? 'manual',
						period_start: new Date().toISOString().split('T')[0] as string,
						period_end: new Date().toISOString().split('T')[0] as string,
						due_date: input.paid_date,
						paid_date: input.paid_date,
						application_fee_amount: 0,
						notes: input.notes ?? null
					})
					.select('id')
					.single()
				if (error) handlePostgrestError(error, 'rent_payments')
				return { success: true, payment: data }
			}
		}),

	exportCsv: () =>
		mutationOptions({
			mutationKey: mutationKeys.rentCollection.exportCsv,
			mutationFn: async (filters?: PaymentFilters): Promise<Blob> => {
				const supabase = createClient()
				let query = supabase
					.from('rent_payments')
					.select('id, amount, currency, status, due_date, paid_date, period_start, period_end, payment_method_type, late_fee_amount, notes, created_at')
					.order('due_date', { ascending: false })
					.limit(10000)

				if (filters?.status) query = query.eq('status', filters.status)
				if (filters?.startDate) query = query.gte('due_date', filters.startDate)
				if (filters?.endDate) query = query.lte('due_date', filters.endDate)

				const { data, error } = await query
				if (error) handlePostgrestError(error, 'rent_payments')
				const csv = rowsToCsv((data ?? []) as unknown as Record<string, unknown>[])
				return new Blob([csv], { type: 'text/csv' })
			}
		}),

	sendReminder: () =>
		mutationOptions({
			mutationKey: mutationKeys.rentPayments.sendReminder,
			mutationFn: async (variables: SendReminderVariables): Promise<SendPaymentReminderResponse> => {
				const supabase = createClient()
				const { data, error } = await supabase.functions.invoke(
					'send-payment-reminder',
					{ body: variables.request }
				)
				if (error) throw new Error(error.message ?? 'Failed to send payment reminder')
				return (data as SendPaymentReminderResponse) ?? { success: true }
			}
		}),

	addPaymentMethod: () =>
		mutationOptions({
			mutationKey: mutationKeys.paymentMethods.add,
			mutationFn: async (input: AddPaymentMethodInput): Promise<PaymentMethodResponse> => {
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
					.select('id, stripe_payment_method_id, type, brand, last_four, exp_month, exp_year, bank_name, is_default, created_at')
					.single()
				if (error) handlePostgrestError(error, 'payment_methods')
				return mapToPaymentMethodResponse(data as Record<string, unknown>)
			}
		}),

	setupAutopay: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenantAutopay.setup,
			mutationFn: async (params: {
				lease_id: string
				enabled: boolean
				payment_method_id?: string | null
			}): Promise<{ success: boolean }> => {
				const supabase = createClient()
				const { error } = await supabase.rpc('toggle_autopay', {
					p_lease_id: params.lease_id,
					p_enabled: params.enabled,
					p_payment_method_id: params.payment_method_id ?? null
				})
				if (error) handlePostgrestError(error, 'toggle_autopay')
				return { success: true }
			}
		}),

	cancelAutopay: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenantAutopay.cancel,
			mutationFn: async (params: {
				lease_id: string
			}): Promise<{ success: boolean }> => {
				const supabase = createClient()
				const { error } = await supabase.rpc('toggle_autopay', {
					p_lease_id: params.lease_id,
					p_enabled: false,
					p_payment_method_id: null
				})
				if (error) handlePostgrestError(error, 'toggle_autopay')
				return { success: true }
			}
		})
}
