/**
 * Late Fees Hooks
 * Phase 6.1: Late Fee System
 *
 * TanStack Query hooks for late fee management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import { leaseQueries } from './queries/lease-queries'
import { rentPaymentKeys } from './use-rent-payments'
import {
	lateFeesQueries,
	lateFeesKeys,
	type ProcessLateFeesResult,
	type ApplyLateFeeResult
} from './queries/late-fees-queries'

/**
 * Get late fee configuration for a lease
 */
export function useLateFeeConfig(lease_id: string) {
	return useQuery(lateFeesQueries.config(lease_id))
}

/**
 * Update late fee configuration
 */
export function useUpdateLateFeeConfig() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			lease_id,
			gracePeriodDays,
			flatFeeAmount
		}: {
			lease_id: string
			gracePeriodDays?: number
			flatFeeAmount?: number
		}) =>
			clientFetch<{ success: boolean; message: string }>(
				`/api/v1/late-fees/lease/${lease_id}/config`,
				{
					method: 'PUT',
					body: JSON.stringify({ gracePeriodDays, flatFeeAmount })
				}
			),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.config(variables.lease_id)
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(variables.lease_id).queryKey
			})
			handleMutationSuccess('Update late fee configuration', 'Configuration updated successfully')
		},
		onError: (error) => handleMutationError(error, 'Update late fee configuration')
	})
}

/**
 * Get overdue payments for a lease
 */
export function useOverduePayments(lease_id: string) {
	return useQuery(lateFeesQueries.overdue(lease_id))
}

/**
 * Process late fees for all overdue payments
 */
export function useProcessLateFees() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (lease_id: string) =>
			clientFetch<ProcessLateFeesResult>(`/api/v1/late-fees/lease/${lease_id}/process`, {
				method: 'POST'
			}),
		onSuccess: (result: ProcessLateFeesResult, lease_id) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.overdue(lease_id)
			})
			queryClient.invalidateQueries({
				queryKey: leaseQueries.detail(lease_id).queryKey
			})
			queryClient.invalidateQueries({
				queryKey: rentPaymentKeys.all
			})

			const totalFormatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD'
			}).format(result.totalLateFees)

			handleMutationSuccess(
				'Process late fees',
				`Processed ${result.processed} late fee(s) - Total: ${totalFormatted}`
			)
		},
		onError: (error) => handleMutationError(error, 'Process late fees')
	})
}

/**
 * Apply late fee to specific payment
 */
export function useApplyLateFee() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			paymentId,
			late_fee_amount,
			reason
		}: {
			paymentId: string
			late_fee_amount: number
			reason: string
		}) =>
			clientFetch<ApplyLateFeeResult>(`/api/v1/late-fees/payment/${paymentId}/apply`, {
				method: 'POST',
				body: JSON.stringify({ late_fee_amount, reason })
			}),
		onSuccess: (result: ApplyLateFeeResult) => {
			queryClient.invalidateQueries({
				queryKey: rentPaymentKeys.all
			})
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.all
			})

			const amountFormatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD'
			}).format(result.amount)

			handleMutationSuccess(
				'Apply late fee',
				`${amountFormatted} late fee added to invoice`
			)
		},
		onError: (error) => handleMutationError(error, 'Apply late fee')
	})
}

/**
 * Hook for prefetching late fee config
 */
export function usePrefetchLateFeeConfig() {
	const queryClient = useQueryClient()

	return (lease_id: string) => {
		queryClient.prefetchQuery(lateFeesQueries.config(lease_id))
	}
}

/**
 * Hook for prefetching overdue payments
 */
export function usePrefetchOverduePayments() {
	const queryClient = useQueryClient()

	return (lease_id: string) => {
		queryClient.prefetchQuery(lateFeesQueries.overdue(lease_id))
	}
}
