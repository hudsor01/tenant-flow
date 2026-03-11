/**
 * Payment Mutation Hooks
 * TanStack Query mutation hooks for payment operations
 *
 * Split from use-payments.ts for the 300-line file size rule.
 * Query hooks remain in use-payments.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { paymentMutations } from './query-keys/payment-mutation-options'
import {
	rentCollectionKeys,
	rentPaymentKeys
} from './query-keys/payment-keys'

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Record a manual payment
 */
export function useRecordManualPaymentMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...paymentMutations.recordManual(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rentCollectionKeys.all })
		},
		onError: (error) => {
			handleMutationError(error, 'Record manual payment')
		}
	})
}

/**
 * Export payments as CSV -- client-side from PostgREST.
 * Downloads the CSV file via browser blob URL.
 */
export function useExportPaymentsMutation() {
	return useMutation({
		...paymentMutations.exportCsv(),
		onSuccess: (blob) => {
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		},
		onError: (error) => {
			handleMutationError(error, 'Export payments')
		}
	})
}

/**
 * Send payment reminder to tenant via Resend email Edge Function.
 * Invokes the send-payment-reminder Edge Function which uses the
 * shared _shared/resend.ts helper to deliver the reminder email.
 */
export function useSendTenantPaymentReminderMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...paymentMutations.sendReminder(),
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
