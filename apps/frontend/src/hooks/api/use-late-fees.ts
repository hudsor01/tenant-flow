/**
 * Late Fees Hooks
 * Phase 6.1: Late Fee System
 *
 * TanStack Query hooks for late fee management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { clientFetch } from '#lib/api/client'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

/**
 * Late fee types
 */
interface LateFeeConfig {
	lease_id: string
	gracePeriodDays: number
	flatFeeAmount: number | null
	percentageFee: number | null
	maxFeeAmount: number | null
}

interface OverduePayment {
	id: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeApplied: boolean
}

interface ProcessLateFeesResult {
	processed: number
	totalLateFees: number
	details: Array<{
		paymentId: string
		late_fee_amount: number
		daysOverdue: number
	}>
}

interface ApplyLateFeeResult {
	invoiceItemId: string
	amount: number
	paymentId: string
}

/**
 * Query keys for late fees
 */
export const lateFeesKeys = {
	all: ['late-fees'] as const,
	config: (lease_id: string) => [...lateFeesKeys.all, 'config', lease_id] as const,
	overdue: (lease_id: string) => [...lateFeesKeys.all, 'overdue', lease_id] as const
}

/**
 * Get late fee configuration for a lease
 */
export function useLateFeeConfig(lease_id: string) {
	return useQuery({
		queryKey: lateFeesKeys.config(lease_id),
		queryFn: () => clientFetch<LateFeeConfig>(`/api/v1/late-fees/lease/${lease_id}/config`),
		enabled: !!lease_id,
		...QUERY_CACHE_TIMES.DETAIL
	})
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
				queryKey: ['leases', variables.lease_id]
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
	return useQuery({
		queryKey: lateFeesKeys.overdue(lease_id),
		queryFn: () =>
			clientFetch<{ payments: OverduePayment[]; gracePeriod: number }>(
				`/api/v1/late-fees/lease/${lease_id}/overdue`
			),
		enabled: !!lease_id,
		staleTime: 60 * 1000 // 1 minute
	})
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
		onSuccess: (result, lease_id) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.overdue(lease_id)
			})
			queryClient.invalidateQueries({
				queryKey: ['leases', lease_id]
			})
			queryClient.invalidateQueries({
				queryKey: ['payments', lease_id]
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
		onSuccess: result => {
			queryClient.invalidateQueries({
				queryKey: ['payments']
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
		queryClient.prefetchQuery({
			queryKey: lateFeesKeys.config(lease_id),
			queryFn: () => clientFetch<LateFeeConfig>(`/api/v1/late-fees/lease/${lease_id}/config`),
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Hook for prefetching overdue payments
 */
export function usePrefetchOverduePayments() {
	const queryClient = useQueryClient()

	return (lease_id: string) => {
		queryClient.prefetchQuery({
			queryKey: lateFeesKeys.overdue(lease_id),
			queryFn: () =>
			clientFetch<{ payments: OverduePayment[]; gracePeriod: number }>(
				`/api/v1/late-fees/lease/${lease_id}/overdue`
			),
			staleTime: 60 * 1000
		})
	}
}
