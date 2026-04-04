/**
 * Billing & Subscription Mutation Hooks
 * TanStack Query mutation hooks for billing and subscription management
 *
 * Split from use-billing.ts for the 300-line file size rule.
 * Query hooks remain in use-billing.ts.
 *
 * Note: update/pause/resume/portal mutations use handleMutationError directly
 * rather than createMutationCallbacks because they redirect to Stripe's hosted
 * portal — no cache invalidation is needed (Stripe webhooks update data async).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handleMutationError } from '#lib/mutation-error-handler'
import { subscriptionsKeys, billingMutations } from './query-keys/subscription-keys'
import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'

// ============================================================================
// SUBSCRIPTION CRUD MUTATIONS
// ============================================================================

export function useCreateSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...billingMutations.createSubscription(),
		...createMutationCallbacks(queryClient, {
			invalidate: [subscriptionsKeys.list()],
			errorContext: 'Create subscription'
		})
	})
}

export function useUpdateSubscriptionMutation() {
	return useMutation({
		...billingMutations.updateSubscription(),
		onError: error => handleMutationError(error, 'Update subscription')
	})
}

export function usePauseSubscriptionMutation() {
	return useMutation({
		...billingMutations.pauseSubscription(),
		onError: error => handleMutationError(error, 'Pause subscription')
	})
}

export function useResumeSubscriptionMutation() {
	return useMutation({
		...billingMutations.resumeSubscription(),
		onError: error => handleMutationError(error, 'Resume subscription')
	})
}

export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...billingMutations.cancelSubscription(),
		...createMutationCallbacks(queryClient, {
			invalidate: [subscriptionsKeys.list()],
			errorContext: 'Cancel subscription'
		})
	})
}

// ============================================================================
// BILLING PORTAL MUTATION
// ============================================================================

/**
 * Opens the Stripe Customer Portal for subscription management.
 * Redirects the user to Stripe's hosted portal via full-page redirect.
 * Return URL is /dashboard?billing=updated (handled by dashboard return-journey toast).
 *
 * Note: This mutation uses an inline key because it is not covered by billingMutations
 * (it is a portal redirect, not a subscription CRUD operation).
 */
export function useBillingPortalMutation() {
	return useMutation({
		mutationKey: ['mutations', 'billing', 'portal'] as const,
		mutationFn: async () => {
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const supabase = createClient()
			const { data: sessionData } = await supabase.auth.getSession()
			const token = sessionData.session?.access_token
			if (!token) throw new Error('No session token')

			const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(`${baseUrl}/functions/v1/stripe-billing-portal`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			})

			if (!response.ok) {
				const err = await response.json().catch(() => ({ error: response.statusText }))
				throw new Error((err as { error?: string }).error ?? `stripe-billing-portal failed: ${response.status}`)
			}

			const result = await response.json() as { url: string }
			window.location.href = result.url
			return result
		},
		onError: error => handleMutationError(error, 'Open billing portal')
	})
}
