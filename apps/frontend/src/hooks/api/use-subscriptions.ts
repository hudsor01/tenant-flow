/**
 * Subscriptions Hooks
 * Phase 4: Autopay Subscriptions
 *
 * TanStack Query hooks for subscription management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'
import { subscriptionsApi } from '@/lib/api/subscriptions'
import { toast } from 'sonner'

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
		queryFn: () => subscriptionsApi.list(),
		staleTime: 30 * 1000 // 30 seconds
	})
}

/**
 * Get subscription by ID
 */
export function useSubscription(id: string) {
	return useQuery({
		queryKey: subscriptionsKeys.detail(id),
		queryFn: () => subscriptionsApi.get(id),
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
			subscriptionsApi.create(data),
		onSuccess: (created: RentSubscriptionResponse) => {
			// Insert created subscription into cache if present
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? [created, ...old] : [created])
			)
			toast.success('Autopay subscription created', {
				description: 'Your rent will be automatically charged each month'
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to create subscription', {
				description: error.message
			})
		}
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
		}) => subscriptionsApi.update(id, data),
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
			toast.success('Subscription updated')
		},
		onError: (error: Error) => {
			toast.error('Failed to update subscription', {
				description: error.message
			})
		}
	})
}

/**
 * Pause subscription
 */
export function usePauseSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => subscriptionsApi.pause(id),
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
			toast.success('Subscription paused', {
				description: 'No charges will be made until you resume'
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to pause subscription', {
				description: error.message
			})
		}
	})
}

/**
 * Resume subscription
 */
export function useResumeSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => subscriptionsApi.resume(id),
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
			toast.success('Subscription resumed', {
				description: 'Automatic payments will continue'
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to resume subscription', {
				description: error.message
			})
		}
	})
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => subscriptionsApi.cancel(id),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old => (old ? old.filter(s => s.id !== res.subscription!.id) : old)
				)
			}
			toast.success('Subscription canceled', {
				description: 'You will not be charged after the current period ends'
			})
		},
		onError: (error: Error) => {
			toast.error('Failed to cancel subscription', {
				description: error.message
			})
		}
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
