/**
 * TanStack Query hooks for Stripe Connect API
 * Phase 6: Frontend Integration for owner Payment Collection
 */
import { clientFetch } from '#lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { ConnectedAccountWithIdentity } from '@repo/shared/types/stripe-connect'

interface CreateConnectAccountRequest {
	displayName: string
	businessName?: string
	country: string
	entityType?: 'individual' | 'company'
}

interface ConnectAccountResponse {
	success: boolean
	data: ConnectedAccountWithIdentity
}

interface OnboardingUrlResponse {
	success: boolean
	data: {
		onboardingUrl: string
	}
}

/**
 * Query keys for Stripe Connect endpoints
 */
export const stripeConnectKeys = {
	all: ['stripeConnect'] as const,
	account: () => [...stripeConnectKeys.all, 'account'] as const
}

/**
 * Hook to fetch owner's connected account details
 */
export function useConnectedAccount() {
	return useQuery({
		queryKey: stripeConnectKeys.account(),
		queryFn: async (): Promise<ConnectedAccountWithIdentity> => {
			const response = await clientFetch<ConnectAccountResponse>(
				'/api/v1/stripe/connect/account'
			)
			return response.data
		},
		...QUERY_CACHE_TIMES.DETAIL,
		retry: 1, // Don't retry much - 404 is expected for new owners
		retryOnMount: false
	})
}

/**
 * Hook to create a new Stripe Connect account
 */
export function useCreateConnectedAccount() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (
			request: CreateConnectAccountRequest
		): Promise<ConnectAccountResponse> => {
		return clientFetch('/api/v1/stripe/connect/onboard', {
				method: 'POST',
				body: JSON.stringify(request)
			})
		},
		onSuccess: () => {
			// Invalidate account query to fetch newly created account
			queryClient.invalidateQueries({ queryKey: stripeConnectKeys.account() })
		}
	})
}

/**
 * Hook to refresh onboarding link for existing account
 */
export function useRefreshOnboarding() {
	return useMutation({
		mutationFn: async (): Promise<OnboardingUrlResponse> => {
		return clientFetch<OnboardingUrlResponse>(
			'/api/v1/stripe/connect/refresh-link',
				{
					method: 'POST'
				}
			)
		}
	})
}

/**
 * Hook for prefetching connected account
 */
export function usePrefetchConnectedAccount() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: stripeConnectKeys.account(),
			queryFn: async (): Promise<ConnectedAccountWithIdentity> => {
				const response = await clientFetch<ConnectAccountResponse>(
					'/api/v1/stripe/connect/account'
				)
				return response.data
			},
			...QUERY_CACHE_TIMES.DETAIL,
		})
	}
}

// ============================================
// Payout & Balance Hooks
// ============================================

interface BalanceAmount {
	amount: number
	currency: string
}

interface BalanceResponse {
	success: boolean
	balance: {
		available: BalanceAmount[]
		pending: BalanceAmount[]
	}
}

interface Payout {
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
	success: boolean
	payouts: Payout[]
	hasMore: boolean
}

interface Transfer {
	id: string
	amount: number
	currency: string
	created: number
	description?: string
	metadata?: Record<string, string>
}

interface TransfersResponse {
	success: boolean
	transfers: Transfer[]
	hasMore: boolean
}

/**
 * Extended query keys for payouts
 */
export const stripePayoutKeys = {
	all: ['stripePayouts'] as const,
	balance: () => [...stripePayoutKeys.all, 'balance'] as const,
	payouts: (params?: { limit?: number; starting_after?: string }) =>
		[...stripePayoutKeys.all, 'list', params] as const,
	transfers: (params?: { limit?: number; starting_after?: string }) =>
		[...stripePayoutKeys.all, 'transfers', params] as const
}

/**
 * Hook to fetch connected account balance
 */
export function useConnectedAccountBalance() {
	return useQuery({
		queryKey: stripePayoutKeys.balance(),
		queryFn: async (): Promise<BalanceResponse['balance']> => {
			const response = await clientFetch<BalanceResponse>(
				'/api/v1/stripe/connect/balance'
			)
			return response.balance
		},
		...QUERY_CACHE_TIMES.STATS, // 1 minute cache for financial data
		retry: 1
	})
}

/**
 * Hook to list payouts for connected account
 */
export function useConnectedAccountPayouts(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery({
		queryKey: stripePayoutKeys.payouts(params),
		queryFn: async (): Promise<{ payouts: Payout[]; hasMore: boolean }> => {
			const queryString = new URLSearchParams()
			if (params?.limit) queryString.set('limit', params.limit.toString())
			if (params?.starting_after) queryString.set('starting_after', params.starting_after)
			const query = queryString.toString()
			const response = await clientFetch<PayoutsResponse>(
				`/api/v1/stripe/connect/payouts${query ? `?${query}` : ''}`
			)
			return { payouts: response.payouts, hasMore: response.hasMore }
		},
		...QUERY_CACHE_TIMES.LIST,
		retry: 1
	})
}

/**
 * Hook to list transfers (rent payments received)
 */
export function useConnectedAccountTransfers(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery({
		queryKey: stripePayoutKeys.transfers(params),
		queryFn: async (): Promise<{ transfers: Transfer[]; hasMore: boolean }> => {
			const queryString = new URLSearchParams()
			if (params?.limit) queryString.set('limit', params.limit.toString())
			if (params?.starting_after) queryString.set('starting_after', params.starting_after)
			const query = queryString.toString()
			const response = await clientFetch<TransfersResponse>(
				`/api/v1/stripe/connect/transfers${query ? `?${query}` : ''}`
			)
			return { transfers: response.transfers, hasMore: response.hasMore }
		},
		...QUERY_CACHE_TIMES.LIST,
		retry: 1
	})
}
