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
				'/api/v1/stripe-connect/account'
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
			return clientFetch('/api/v1/stripe-connect/create', {
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
				'/api/v1/stripe-connect/refresh-onboarding',
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
					'/api/v1/stripe-connect/account'
				)
				return response.data
			},
			...QUERY_CACHE_TIMES.DETAIL,
		})
	}
}
