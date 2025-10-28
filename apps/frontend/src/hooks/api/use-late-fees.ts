/**
 * Late Fees Hooks
 * Phase 6.1: Late Fee System
 *
 * TanStack Query hooks for late fee management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lateFeesApi } from '#lib/api-client'
import { toast } from 'sonner'

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
		queryFn: () => lateFeesApi.getConfig(leaseId),
		enabled: !!leaseId,
		staleTime: 5 * 60 * 1000 // 5 minutes
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
		}) => lateFeesApi.updateConfig(leaseId, gracePeriodDays, flatFeeAmount),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: lateFeesKeys.config(variables.leaseId)
			})
			queryClient.invalidateQueries({
				queryKey: ['lease', variables.leaseId]
			})
			toast.success('Late fee configuration updated', {
				description: 'Your changes have been saved successfully'
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to update late fee configuration', {
				description: error.message
			})
		}
	})
}

/**
 * Get overdue payments for a lease
 */
export function useOverduePayments(leaseId: string) {
	return useQuery({
		queryKey: lateFeesKeys.overdue(leaseId),
		queryFn: () => lateFeesApi.getOverduePayments(leaseId),
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
		mutationFn: (leaseId: string) => lateFeesApi.processLateFees(leaseId),
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

			toast.success(`Processed ${result.processed} late fee(s)`, {
				description: `Total late fees applied: ${totalFormatted}`
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to process late fees', {
				description: error.message
			})
		}
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
		}) => lateFeesApi.applyLateFee(paymentId, lateFeeAmount, reason),
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

			toast.success('Late fee applied', {
				description: `${amountFormatted} late fee has been added to the invoice`
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to apply late fee', {
				description: error.message
			})
		}
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
			queryFn: () => lateFeesApi.getConfig(leaseId),
			staleTime: 5 * 60 * 1000
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
			queryFn: () => lateFeesApi.getOverduePayments(leaseId),
			staleTime: 60 * 1000
		})
	}
}
