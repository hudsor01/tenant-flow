/**
 * TanStack Query hooks for Stripe Connect API
 * Calls the stripe-connect Supabase Edge Function directly (no NestJS).
 */
import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import {
	stripeConnectKeys,
	stripeConnectQueries,
	callStripeConnectFunction,
} from './query-keys/stripe-connect-keys'

export { stripeConnectKeys, stripePayoutKeys, type Payout, type Transfer } from './query-keys/stripe-connect-keys'

// ============================================================================
// Types
// ============================================================================

interface CreateConnectAccountRequest {
	displayName?: string
	businessName?: string
	country?: string
	entityType?: 'individual' | 'company'
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
		}),

	dashboardLink: () =>
		mutationOptions<{ url: string }, unknown, void>({
			mutationKey: mutationKeys.stripeConnect.dashboardLink,
			mutationFn: async () => {
				return callStripeConnectFunction<{ url: string }>('login-link')
			}
		})
}

// ============================================================================
// Hooks
// ============================================================================

export function useConnectedAccount() {
	return useQuery(stripeConnectQueries.account())
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

export function useStripeDashboardLink() {
	return useMutation({
		...stripeConnectMutationFactories.dashboardLink(),
		onSuccess: (data) => {
			window.open(data.url, '_blank')
		},
		onError: (error) => {
			handleMutationError(
				error,
				'Open Stripe Dashboard',
				'Unable to open Stripe Dashboard -- try again'
			)
		},
	})
}

export function useConnectedAccountBalance() {
	return useQuery(stripeConnectQueries.balance())
}

export function useConnectedAccountPayouts(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery(stripeConnectQueries.payouts(params))
}

export function useConnectedAccountTransfers(params?: {
	limit?: number
	starting_after?: string
}) {
	return useQuery(stripeConnectQueries.transfers(params))
}
