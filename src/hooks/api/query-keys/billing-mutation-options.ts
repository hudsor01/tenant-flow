/**
 * Billing Mutation Options
 * mutationOptions() factories for subscription management.
 *
 * Factories contain ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled remain in the hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { mutationKeys } from '../mutation-keys'
import type {
	CreateRentSubscriptionRequest,
	RentSubscriptionResponse,
	UpdateSubscriptionRequest
} from '#shared/types/api-contracts'

// ============================================================================
// EDGE FUNCTION HELPER
// ============================================================================

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
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const billingMutations = {
	createSubscription: () =>
		mutationOptions({
			mutationKey: mutationKeys.subscriptions.create,
			mutationFn: async (data: CreateRentSubscriptionRequest): Promise<RentSubscriptionResponse> => {
				const result = await callBillingEdgeFunction<{ url: string }>('stripe-checkout', {
					price_id: undefined
				})
				window.location.href = result.url
				return { id: data.leaseId, status: 'redirecting' } as RentSubscriptionResponse
			}
		}),

	updateSubscription: () =>
		mutationOptions({
			mutationKey: mutationKeys.subscriptions.update,
			mutationFn: async (_args: { id: string; data: UpdateSubscriptionRequest }): Promise<RentSubscriptionResponse> => {
				const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
				window.location.href = result.url
				return {} as RentSubscriptionResponse
			}
		}),

	pauseSubscription: () =>
		mutationOptions({
			mutationKey: mutationKeys.subscriptions.pause,
			mutationFn: async (_id: string): Promise<{ subscription: undefined }> => {
				const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
				window.location.href = result.url
				return { subscription: undefined }
			}
		}),

	resumeSubscription: () =>
		mutationOptions({
			mutationKey: mutationKeys.subscriptions.resume,
			mutationFn: async (_id: string): Promise<{ subscription: undefined }> => {
				const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
				window.location.href = result.url
				return { subscription: undefined }
			}
		}),

	cancelSubscription: () =>
		mutationOptions({
			mutationKey: mutationKeys.subscriptions.cancel,
			mutationFn: async (_id: string): Promise<{ subscription: undefined }> => {
				const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
				window.location.href = result.url
				return { subscription: undefined }
			}
		})
}
