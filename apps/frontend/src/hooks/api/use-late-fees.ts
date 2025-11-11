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
	leaseId: string
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
		lateFeeAmount: number
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
	config: (leaseId: string) => [...lateFeesKeys.all, 'config', leaseId] as const,
	overdue: (leaseId: string) => [...lateFeesKeys.all, 'overdue', leaseId] as const
}

/**
 * Get late fee configuration for a lease
 */
export function useLateFeeConfig(leaseId: string) {
	return useQuery({
		queryKey: lateFeesKeys.config(leaseId),
		queryFn: () => clientFetch<LateFeeConfig>(`/api/v1/late-fees/lease/${leaseId}/config`),
		enabled: !!leaseId,
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
			leaseId,
			gracePeriodDays,
			flatFeeAmount
		}: {
			leaseId: string
			gracePeriodDays?: number
			flatFeeAmount?: number
		}) =>
			clientFetch<{ success: boolean; message: string }>(
				`/api/v1/late-fees/lease/${leaseId}/config`,
				{
					method: 'PUT',
					body: JSON.stringify({ gracePeriodDays, flatFeeAmount })
				}
			),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.config(variables.leaseId)
			})
			queryClient.invalidateQueries({
				queryKey: ['lease', variables.leaseId]
			})
			handleMutationSuccess('Update late fee configuration', 'Configuration updated successfully')
		},
		onError: (error) => handleMutationError(error, 'Update late fee configuration')
	})
}

/**
 * Get overdue payments for a lease
 */
export function useOverduePayments(leaseId: string) {
	return useQuery({
		queryKey: lateFeesKeys.overdue(leaseId),
		queryFn: () =>
			clientFetch<{ payments: OverduePayment[]; gracePeriod: number }>(
				`/api/v1/late-fees/lease/${leaseId}/overdue`
			),
		enabled: !!leaseId,
		staleTime: 60 * 1000 // 1 minute
	})
}

/**
 * Process late fees for all overdue payments
 */
export function useProcessLateFees() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (leaseId: string) =>
			clientFetch<ProcessLateFeesResult>(`/api/v1/late-fees/lease/${leaseId}/process`, {
				method: 'POST'
			}),
		onSuccess: (result, leaseId) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.overdue(leaseId)
			})
			queryClient.invalidateQueries({
				queryKey: ['lease', leaseId]
			})
			queryClient.invalidateQueries({
				queryKey: ['payments', leaseId]
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
			lateFeeAmount,
			reason
		}: {
			paymentId: string
			lateFeeAmount: number
			reason: string
		}) =>
			clientFetch<ApplyLateFeeResult>(`/api/v1/late-fees/payment/${paymentId}/apply`, {
				method: 'POST',
				body: JSON.stringify({ lateFeeAmount, reason })
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

	return (leaseId: string) => {
		queryClient.prefetchQuery({
			queryKey: lateFeesKeys.config(leaseId),
			queryFn: () => clientFetch<LateFeeConfig>(`/api/v1/late-fees/lease/${leaseId}/config`),
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Hook for prefetching overdue payments
 */
export function usePrefetchOverduePayments() {
	const queryClient = useQueryClient()

	return (leaseId: string) => {
		queryClient.prefetchQuery({
			queryKey: lateFeesKeys.overdue(leaseId),
			queryFn: () =>
			clientFetch<{ payments: OverduePayment[]; gracePeriod: number }>(
				`/api/v1/late-fees/lease/${leaseId}/overdue`
			),
			staleTime: 60 * 1000
		})
	}
}
