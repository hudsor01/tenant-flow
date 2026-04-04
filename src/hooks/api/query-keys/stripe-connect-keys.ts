/**
 * Stripe Connect Query Keys & Options
 * queryOptions() factories for Stripe Connect domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import type { ConnectedAccountWithIdentity } from '#types/stripe'

// ============================================================================
// Types
// ============================================================================

interface BalanceAmount {
	amount: number
	currency: string
}

interface BalanceResponse {
	balance: {
		available: BalanceAmount[]
		pending: BalanceAmount[]
	}
}

export interface Payout {
	id: string
	amount: number
	currency: string
	status: string
	arrival_date: number
	created: number
	method: string
	type: string
	description?: string
	failure_message?: string
}

interface PayoutsResponse {
	payouts: Payout[]
	hasMore: boolean
}

export interface Transfer {
	id: string
	amount: number
	currency: string
	created: number
	description?: string
	metadata?: Record<string, string>
}

interface TransfersResponse {
	transfers: Transfer[]
	hasMore: boolean
}

// ============================================================================
// Edge Function Helper
// ============================================================================

export async function callStripeConnectFunction<T>(
	action: string,
	body?: Record<string, unknown>
): Promise<T> {
	const user = await getCachedUser()
	if (!user) throw new Error('Not authenticated')

	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('No session token')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/stripe-connect`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ action, ...body }),
	})

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText })) as Record<string, unknown>
		throw new Error((err.error as string | undefined) ?? `stripe-connect failed: ${response.status}`)
	}

	return response.json() as Promise<T>
}

// ============================================================================
// Query Keys
// ============================================================================

export const stripeConnectKeys = {
	all: ['stripeConnect'] as const,
	account: () => [...stripeConnectKeys.all, 'account'] as const,
}

export const stripePayoutKeys = {
	all: ['stripePayouts'] as const,
	balance: () => [...stripePayoutKeys.all, 'balance'] as const,
	payouts: (params?: { limit?: number; starting_after?: string }) =>
		[...stripePayoutKeys.all, 'list', params] as const,
	transfers: (params?: { limit?: number; starting_after?: string }) =>
		[...stripePayoutKeys.all, 'transfers', params] as const,
}

// ============================================================================
// Query Options
// ============================================================================

export const stripeConnectQueries = {
	/**
	 * Get the connected Stripe account for the current user
	 */
	account: () =>
		queryOptions({
			queryKey: stripeConnectKeys.account(),
			queryFn: async (): Promise<ConnectedAccountWithIdentity | null> => {
				try {
					const result = await callStripeConnectFunction<{
						account: ConnectedAccountWithIdentity | null
						hasAccount: boolean
					}>('account')
					return result.account
				} catch {
					return null
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retryOnMount: false,
		}),

	/**
	 * Get balance for the connected Stripe account
	 */
	balance: () =>
		queryOptions({
			queryKey: stripePayoutKeys.balance(),
			queryFn: async (): Promise<BalanceResponse['balance']> => {
				const result = await callStripeConnectFunction<BalanceResponse>('balance')
				return result.balance
			},
			...QUERY_CACHE_TIMES.STATS,
		}),

	/**
	 * List payouts for the connected Stripe account
	 */
	payouts: (params?: { limit?: number; starting_after?: string }) =>
		queryOptions({
			queryKey: stripePayoutKeys.payouts(params),
			queryFn: async (): Promise<{ payouts: Payout[]; hasMore: boolean }> => {
				const result = await callStripeConnectFunction<PayoutsResponse>('payouts', params)
				return { payouts: result.payouts, hasMore: result.hasMore }
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	/**
	 * List transfers for the connected Stripe account
	 */
	transfers: (params?: { limit?: number; starting_after?: string }) =>
		queryOptions({
			queryKey: stripePayoutKeys.transfers(params),
			queryFn: async (): Promise<{ transfers: Transfer[]; hasMore: boolean }> => {
				const result = await callStripeConnectFunction<TransfersResponse>('transfers', params)
				return { transfers: result.transfers, hasMore: result.hasMore }
			},
			...QUERY_CACHE_TIMES.LIST,
		})
}
