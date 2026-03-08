/**
 * Payment Mutation Hooks
 * TanStack Query mutation hooks for payment operations
 *
 * Split from use-payments.ts for the 300-line file size rule.
 * Query hooks remain in use-payments.ts.
 */

import {
	useMutation,
	useQueryClient,
	type QueryKey
} from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import {
	rentCollectionKeys,
	rentPaymentKeys
} from './query-keys/payment-keys'
import type {
	SendPaymentReminderRequest,
	SendPaymentReminderResponse
} from '#types/api-contracts'
import type {
	PaymentFilters,
	ManualPaymentInput
} from '#types/sections/payments'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert rent_payments rows to CSV string
 */
function rowsToCsv(rows: Record<string, unknown>[]): string {
	if (rows.length === 0) return ''
	const headers = Object.keys(rows[0] as Record<string, unknown>)
	const headerRow = headers.join(',')
	const dataRows = rows.map(row =>
		headers
			.map(h => {
				const val = (row as Record<string, unknown>)[h]
				const str = val === null || val === undefined ? '' : String(val)
				// Escape double-quotes and wrap in quotes if value contains comma/newline/quote
				return str.includes(',') || str.includes('"') || str.includes('\n')
					? `"${str.replace(/"/g, '""')}"`
					: str
			})
			.join(',')
	)
	return [headerRow, ...dataRows].join('\n')
}

/**
 * Export payments as CSV — client-side generation from PostgREST
 */
async function exportPaymentsCSV(
	filters?: PaymentFilters
): Promise<Blob> {
	const supabase = createClient()
	let query = supabase
		.from('rent_payments')
		.select(
			'id, amount, currency, status, due_date, paid_date, period_start, period_end, payment_method_type, late_fee_amount, notes, created_at'
		)
		.order('due_date', { ascending: false })
		.limit(10000)

	if (filters?.status) {
		query = query.eq('status', filters.status)
	}
	if (filters?.startDate) {
		query = query.gte('due_date', filters.startDate)
	}
	if (filters?.endDate) {
		query = query.lte('due_date', filters.endDate)
	}

	const { data, error } = await query
	if (error) handlePostgrestError(error, 'rent_payments')
	const csv = rowsToCsv((data ?? []) as unknown as Record<string, unknown>[])
	return new Blob([csv], { type: 'text/csv' })
}

/**
 * Record a manual payment — PostgREST insert into rent_payments
 */
async function recordManualPayment(
	input: ManualPaymentInput
): Promise<{ success: boolean; payment: unknown }> {
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

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Record a manual payment
 */
export function useRecordManualPaymentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentCollection.recordManual,
		mutationFn: (data: ManualPaymentInput) => recordManualPayment(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rentCollectionKeys.all })
		},
		onError: (error) => {
			handleMutationError(error, 'Record manual payment')
		}
	})
}

/**
 * Export payments as CSV — client-side from PostgREST
 */
export function useExportPaymentsMutation() {
	return useMutation({
		mutationKey: mutationKeys.rentCollection.exportCsv,
		mutationFn: async (filters?: PaymentFilters) => {
			const blob = await exportPaymentsCSV(filters)

			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			return blob
		},
		onError: (error) => {
			handleMutationError(error, 'Export payments')
		}
	})
}

type SendReminderVariables = {
	request: SendPaymentReminderRequest
	ownerQueryKey?: QueryKey
}

/**
 * Send payment reminder to tenant via Resend email Edge Function.
 * Invokes the send-payment-reminder Edge Function which uses the
 * shared _shared/resend.ts helper to deliver the reminder email.
 */
export function useSendTenantPaymentReminderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.rentPayments.sendReminder,
		mutationFn: async (variables: SendReminderVariables): Promise<SendPaymentReminderResponse> => {
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'send-payment-reminder',
				{
					body: variables.request
				}
			)
			if (error) throw new Error(error.message ?? 'Failed to send payment reminder')
			return (data as SendPaymentReminderResponse) ?? { success: true }
		},
		onSuccess: (_data, variables) => {
			if (variables?.ownerQueryKey) {
				queryClient.invalidateQueries({
					queryKey: variables.ownerQueryKey
				})
			} else if (variables?.request.tenant_id) {
				queryClient.invalidateQueries({
					queryKey: rentPaymentKeys.ownerView(variables.request.tenant_id)
				})
			}
		},
		onError: (error) => {
			handleMutationError(error, 'Send payment reminder')
		}
	})
}
