/**
 * Billing & Subscription Mutation Hooks
 * TanStack Query mutation hooks for billing and subscription management
 *
 * Split from use-billing.ts for the 300-line file size rule.
 * Query hooks remain in use-billing.ts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import type {
	CreateRentSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '#shared/types/api-contracts'
import { subscriptionsKeys } from './query-keys/billing-keys'
import { mutationKeys } from './mutation-keys'

// ============================================================================
// EDGE FUNCTION HELPER
// ============================================================================

/**
 * Call a billing Edge Function with the user's JWT.
 * Returns the parsed JSON response typed as T.
 */
async function callBillingEdgeFunction<T>(
	functionName: 'stripe-checkout' | 'stripe-billing-portal',
	body?: Record<string, unknown>
): Promise<T> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body ?? {})
	})

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? `${functionName} failed: ${response.status}`)
	}

	return response.json() as Promise<T>
}

// ============================================================================
// SUBSCRIPTION CRUD MUTATIONS
// ============================================================================

export function useCreateSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.create,
		mutationFn: async (data: CreateRentSubscriptionRequest) => {
			// Redirect to Stripe Checkout via Edge Function — full-page redirect per user decision
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-checkout', {
				price_id: undefined // uses STRIPE_PRO_PRICE_ID env var on Edge Function
			})
			// Full-page redirect to Stripe Checkout (Radar fraud detection enabled)
			window.location.href = result.url
			// Return stub — page will navigate away before this resolves
			return { id: data.leaseId, status: 'redirecting' } as RentSubscriptionResponse
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subscriptionsKeys.list() })
		},
		onError: error => handleMutationError(error, 'Create subscription')
	})
}

export function useUpdateSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.update,
		mutationFn: async (_args: { id: string; data: UpdateSubscriptionRequest }) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return {} as RentSubscriptionResponse
		},
		onError: error => handleMutationError(error, 'Update subscription')
	})
}

export function usePauseSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.pause,
		mutationFn: async (_id: string) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onError: error => handleMutationError(error, 'Pause subscription')
	})
}

export function useResumeSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.resume,
		mutationFn: async (_id: string) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onError: error => handleMutationError(error, 'Resume subscription')
	})
}

export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.cancel,
		mutationFn: async (_id: string) => {
			// Subscription cancellation is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subscriptionsKeys.list() })
		},
		onError: error => handleMutationError(error, 'Cancel subscription')
	})
}

// ============================================================================
// BILLING PORTAL MUTATION
// ============================================================================

/**
 * Opens the Stripe Customer Portal for subscription management.
 * Redirects the user to Stripe's hosted portal via full-page redirect.
 * Return URL is /dashboard?billing=updated (handled by dashboard return-journey toast).
 */
export function useBillingPortalMutation() {
	return useMutation({
		mutationKey: ['mutations', 'billing', 'portal'] as const,
		mutationFn: async () => {
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return result
		},
		onError: error => handleMutationError(error, 'Open billing portal')
	})
}
