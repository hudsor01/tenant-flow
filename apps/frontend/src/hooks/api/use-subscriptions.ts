/**
 * Subscriptions Hooks
 * Phase 4: Autopay Subscriptions
 *
 * TanStack Query hooks for subscription management
 */

import { API_BASE_URL } from '#lib/api-config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

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
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch subscriptions')
			}
			return res.json()
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
		queryFn: async (): Promise<RentSubscriptionResponse> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch subscription')
			}
			return res.json()
		},
		enabled: !!id
	})
}

/**
 * Create subscription
 */
export function useCreateSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: CreateSubscriptionRequest): Promise<RentSubscriptionResponse> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})
			if (!res.ok) {
				throw new Error('Failed to create subscription')
			}
			return res.json()
		},
		onSuccess: (created: RentSubscriptionResponse) => {
			// Insert created subscription into cache if present
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? [created, ...old] : [created])
			)
			handleMutationSuccess('Create subscription', 'Your rent will be automatically charged each month')
		},
		onError: (error) => handleMutationError(error, 'Create subscription')
	})
}

/**
 * Update subscription
 */
export function useUpdateSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data
		}: {
			id: string
			data: UpdateSubscriptionRequest
		}): Promise<RentSubscriptionResponse> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(data)
			})
			if (!res.ok) {
				throw new Error('Failed to update subscription')
			}
			return res.json()
		},
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
		onError: (error) => handleMutationError(error, 'Update subscription')
	})
}

/**
 * Pause subscription
 */
export function usePauseSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<{ subscription?: RentSubscriptionResponse }> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}/pause`, {
				method: 'POST',
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to pause subscription')
			}
			return res.json()
		},
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
			handleMutationSuccess('Pause subscription', 'No charges will be made until you resume')
		},
		onError: (error) => handleMutationError(error, 'Pause subscription')
	})
}

/**
 * Resume subscription
 */
export function useResumeSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<{ subscription?: RentSubscriptionResponse }> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}/resume`, {
				method: 'POST',
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to resume subscription')
			}
			return res.json()
		},
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
			handleMutationSuccess('Resume subscription', 'Automatic payments will continue')
		},
		onError: (error) => handleMutationError(error, 'Resume subscription')
	})
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<{ subscription?: RentSubscriptionResponse }> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to cancel subscription')
			}
			return res.json()
		},
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old => (old ? old.filter(s => s.id !== res.subscription!.id) : old)
				)
			}
			handleMutationSuccess('Cancel subscription', 'You will not be charged after the current period ends')
		},
		onError: (error) => handleMutationError(error, 'Cancel subscription')
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

	return subscriptions.some(
		s => s.leaseId === leaseId && s.status === 'active'
	)
}

/**
 * Hook for prefetching subscriptions list
 */
export function usePrefetchSubscriptions() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: subscriptionsKeys.list(),
			queryFn: async (): Promise<RentSubscriptionResponse[]> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch subscriptions')
				}
				return res.json()
			},
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
			queryFn: async (): Promise<RentSubscriptionResponse> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${id}`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch subscription')
				}
				return res.json()
			},
			staleTime: 60 * 1000
		})
	}
}
