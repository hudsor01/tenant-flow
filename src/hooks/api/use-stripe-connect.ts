/**
 * TanStack Query hooks for Stripe Connect API
 * Calls the stripe-connect Supabase Edge Function directly (no NestJS).
 */
import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { handleMutationError } from '#lib/mutation-error-handler'
import { createClient } from '#lib/supabase/client'
import { mutationKeys } from './mutation-keys'
import type { ConnectedAccountWithIdentity } from '#types/stripe'

// ============================================================================
// Types
// ============================================================================

interface CreateConnectAccountRequest {
	displayName?: string
	businessName?: string
	country?: string
	entityType?: 'individual' | 'company'
}

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
// Edge Function helper
// ============================================================================

async function callStripeConnectFunction<T>(
	action: string,
	body?: Record<string, unknown>
): Promise<T> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

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
// Mutation Options Factories
// ============================================================================

const stripeConnectMutationFactories = {
	createAccount: () =>
		mutationOptions({
			mutationKey: mutationKeys.stripeConnect.createAccount,
			mutationFn: async (request: CreateConnectAccountRequest) => {
				const result = await callStripeConnectFunction<{
					onboardingUrl: string
					accountId: string
				}>('onboard', {
					displayName: request.displayName,
					businessName: request.businessName,
					country: request.country,
					entityType: request.entityType,
				})
				window.location.href = result.onboardingUrl
				return result
			}
		}),

	refreshLink: () =>
		mutationOptions<{ onboardingUrl: string }, unknown, void>({
			mutationKey: mutationKeys.stripeConnect.refreshLink,
			mutationFn: async () => {
				const result = await callStripeConnectFunction<{ onboardingUrl: string }>('refresh-link')
				window.location.href = result.onboardingUrl
				return result
			}
		})
}

// ============================================================================
// Hooks
// ============================================================================

export function useConnectedAccount() {
	return useQuery({
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
	})
}

export function useCreateConnectedAccountMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...stripeConnectMutationFactories.createAccount(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: stripeConnectKeys.account() })
		},
		onError: (error) => {
			handleMutationError(
				error,
				'Connect Stripe account',
				'Unable to connect to Stripe -- try again'
			)
		},
	})
}

export function useRefreshOnboardingMutation() {
	return useMutation({
		...stripeConnectMutationFactories.refreshLink(),
		onError: (error) => {
			handleMutationError(
				error,
				'Refresh onboarding link',
				'Unable to connect to Stripe -- try again'
			)
		},
	})
}

export function useConnectedAccountBalance() {
	return useQuery({
		queryKey: stripePayoutKeys.balance(),
		queryFn: async (): Promise<BalanceResponse['balance']> => {
			const result = await callStripeConnectFunction<BalanceResponse>('balance')
			return result.balance
		},
		...QUERY_CACHE_TIMES.STATS,
	})
}

export function useConnectedAccountPayouts(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery({
		queryKey: stripePayoutKeys.payouts(params),
		queryFn: async (): Promise<{ payouts: Payout[]; hasMore: boolean }> => {
			const result = await callStripeConnectFunction<PayoutsResponse>('payouts', params)
			return { payouts: result.payouts, hasMore: result.hasMore }
		},
		...QUERY_CACHE_TIMES.LIST,
	})
}

export function useConnectedAccountTransfers(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery({
		queryKey: stripePayoutKeys.transfers(params),
		queryFn: async (): Promise<{ transfers: Transfer[]; hasMore: boolean }> => {
			const result = await callStripeConnectFunction<TransfersResponse>('transfers', params)
			return { transfers: result.transfers, hasMore: result.hasMore }
		},
		...QUERY_CACHE_TIMES.LIST,
	})
}
