/**
 * TanStack Query hooks for Stripe Connect API
 * Phase 6: Frontend Integration for Landlord Payment Collection
 */
import type { Database } from '@repo/shared/types/supabase-generated'
import { apiClient } from '@repo/shared/utils/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api-client'

type ConnectedAccount = Database['public']['Tables']['connected_account']['Row']

interface CreateConnectAccountRequest {
	displayName: string
	businessName?: string
	country?: string
	entityType?: 'individual' | 'company'
}

interface ConnectAccountResponse {
	success: boolean
	data: ConnectedAccount
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
 * Hook to fetch landlord's connected account details
 */
export function useConnectedAccount() {
	return useQuery({
		queryKey: stripeConnectKeys.account(),
		queryFn: async () => {
			const response = await apiClient<ConnectAccountResponse>(
				`${API_BASE_URL}/api/v1/stripe-connect/account`
			)
			return response.data
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1, // Don't retry much - 404 is expected for new landlords
		retryOnMount: false
	})
}

/**
 * Hook to create a new Stripe Connect account
 */
export function useCreateConnectedAccount() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (request: CreateConnectAccountRequest) => {
			return await apiClient<ConnectAccountResponse>(
				`${API_BASE_URL}/api/v1/stripe-connect/create`,
				{
					method: 'POST',
					body: JSON.stringify(request)
				}
			)
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
		mutationFn: async () => {
			return await apiClient<OnboardingUrlResponse>(
				`${API_BASE_URL}/api/v1/stripe-connect/refresh-onboarding`,
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
			queryFn: async () => {
				return await apiClient<ConnectAccountResponse>(
					`${API_BASE_URL}/api/v1/stripe-connect/account`
				)
			},
			staleTime: 5 * 60 * 1000
		})
	}
}
