/**
 * Subscriptions Hooks
 * Phase 4: Autopay Subscriptions
 *
 * TanStack Query hooks for subscription management
 */

import { clientFetch } from '#lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'


/**
 * Query keys for subscriptions
 */
export const subscriptionsKeys = {
	all: ['subscriptions'] as const,
	list: () => [...subscriptionsKeys.all, 'list'] as const,
	detail: (id: string) => [...subscriptionsKeys.all, 'detail', id] as const
}

/**
 * List subscriptions
 */
export function useSubscriptions() {
	return useQuery({
		queryKey: subscriptionsKeys.list(),
		queryFn: async (): Promise<RentSubscriptionResponse[]> => {
			return clientFetch<RentSubscriptionResponse[]>('/api/v1/subscriptions')
		},
		staleTime: 30 * 1000 // 30 seconds
	})
}

/**
 * Get subscription by ID
 */
export function useSubscription(id: string) {
	return useQuery({
		queryKey: subscriptionsKeys.detail(id),
		queryFn: () => clientFetch<RentSubscriptionResponse>(`/api/v1/subscriptions/${id}`),
		enabled: !!id
	})
}

/**
 * Create subscription
 */
export function useCreateSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateSubscriptionRequest) =>
			clientFetch<RentSubscriptionResponse>('/api/v1/subscriptions', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (created: RentSubscriptionResponse) => {
			// Insert created subscription into cache if present
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? [created, ...old] : [created])
			)
			handleMutationSuccess(
				'Create subscription',
				'Your rent will be automatically charged each month'
			)
		},
		onError: error => handleMutationError(error, 'Create subscription')
	})
}

/**
 * Update subscription
 */
export function useUpdateSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			id,
			data
		}: {
			id: string
			data: UpdateSubscriptionRequest
		}) =>
			clientFetch<RentSubscriptionResponse>(`/api/v1/subscriptions/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data)
			}),
		onSuccess: (updated: RentSubscriptionResponse, variables) => {
			// Update list cache and detail cache if present
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? old.map(s => (s.id === updated.id ? updated : s)) : old)
			)
			queryClient.setQueryData<RentSubscriptionResponse | undefined>(
				subscriptionsKeys.detail(variables.id),
				updated
			)
			handleMutationSuccess('Update subscription')
		},
		onError: error => handleMutationError(error, 'Update subscription')
	})
}

/**
 * Pause subscription
 */
export function usePauseSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			clientFetch<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}/pause`,
				{
					method: 'POST'
				}
			),
		onSuccess: res => {
			// Update cache entry if pause returns subscription
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old =>
						old
							? old.map(s =>
									s.id === res.subscription!.id ? res.subscription! : s
								)
							: old
				)
			}
			handleMutationSuccess(
				'Pause subscription',
				'No charges will be made until you resume'
			)
		},
		onError: error => handleMutationError(error, 'Pause subscription')
	})
}

/**
 * Resume subscription
 */
export function useResumeSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			clientFetch<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}/resume`,
				{
					method: 'POST'
				}
			),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old =>
						old
							? old.map(s =>
									s.id === res.subscription!.id ? res.subscription! : s
								)
							: old
				)
			}
			handleMutationSuccess(
				'Resume subscription',
				'Automatic payments will continue'
			)
		},
		onError: error => handleMutationError(error, 'Resume subscription')
	})
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			clientFetch<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}`,
				{
					method: 'DELETE'
				}
			),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old => (old ? old.filter(s => s.id !== res.subscription!.id) : old)
				)
			}
			handleMutationSuccess(
				'Cancel subscription',
				'You will not be charged after the current period ends'
			)
		},
		onError: error => handleMutationError(error, 'Cancel subscription')
	})
}

/**
 * Get active subscriptions
 */
export function useActiveSubscriptions(): RentSubscriptionResponse[] {
	const { data: subscriptions } = useSubscriptions()
	return subscriptions?.filter(s => s.status === 'active') || []
}

/**
 * Check if user has an active subscription for a lease
 */
export function useHasActiveSubscription(leaseId?: string): boolean {
	const { data: subscriptions } = useSubscriptions()
	if (!leaseId || !subscriptions) return false

	return subscriptions.some(s => s.leaseId === leaseId && s.status === 'active')
}

/**
 * Hook for prefetching subscriptions list
 */
export function usePrefetchSubscriptions() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: subscriptionsKeys.list(),
			queryFn: () => clientFetch<RentSubscriptionResponse[]>('/api/v1/subscriptions'),
			staleTime: 60 * 1000
		})
	}
}

/**
 * Hook for prefetching single subscription
 */
export function usePrefetchSubscription() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: subscriptionsKeys.detail(id),
			queryFn: () => clientFetch<RentSubscriptionResponse>(`/api/v1/subscriptions/${id}`),
			staleTime: 60 * 1000
		})
	}
}
