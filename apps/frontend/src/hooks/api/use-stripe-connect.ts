/**
 * TanStack Query hooks for Stripe Connect API
 * Phase 6: Frontend Integration for Landlord Payment Collection
 */
import { API_BASE_URL } from '#lib/api-config'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
		queryFn: async (): Promise<ConnectedAccount> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/stripe-connect/account`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch connected account')
			}
			const response = await res.json() as ConnectAccountResponse
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
		mutationFn: async (request: CreateConnectAccountRequest): Promise<ConnectAccountResponse> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/stripe-connect/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(request)
			})
			if (!res.ok) {
				throw new Error('Failed to create connected account')
			}
			return res.json()
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
			const res = await fetch(`${API_BASE_URL}/api/v1/stripe-connect/refresh-onboarding`, {
				method: 'POST',
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to refresh onboarding')
			}
			return res.json()
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
			queryFn: async (): Promise<ConnectedAccount> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/stripe-connect/account`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch connected account')
				}
				const response = await res.json() as ConnectAccountResponse
				return response.data
			},
			staleTime: 5 * 60 * 1000
		})
	}
}
