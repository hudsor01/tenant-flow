/**
 * Billing & Subscriptions Hooks
 * TanStack Query hooks for billing, invoices, and subscription management
 *
 * Includes:
 * - Stripe invoices
 * - Subscription payment history
 * - Subscription CRUD operations
 * - Real-time subscription status verification
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { getApiBaseUrl } from '#lib/api-config'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	BillingHistoryItem,
	CreateRentSubscriptionRequest,
	FailedPaymentAttempt,
	RentSubscriptionResponse,
	StripeInvoice,
	SubscriptionStatusResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

const logger = createLogger({ component: 'UseBilling' })

// ============================================================================
// TYPES (Hook-specific, not shared)
// ============================================================================

/**
 * Formatted invoice for display - frontend presentation format
 */
export interface FormattedInvoice {
	id: string
	date: string
	amount: string
	status: string
	invoicePdf: string | null
	hostedUrl: string | null
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatCurrency(amountInCents: number, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase()
	}).format(amountInCents / 100)
}

function formatDate(timestamp: number): string {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(new Date(timestamp * 1000))
}

function formatStatus(status: string): string {
	const statusMap: Record<string, string> = {
		paid: 'Paid',
		open: 'Open',
		draft: 'Draft',
		uncollectible: 'Uncollectible',
		void: 'Void'
	}
	return statusMap[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
}

function formatInvoice(invoice: StripeInvoice): FormattedInvoice {
	return {
		id: invoice.id,
		date: formatDate(invoice.created),
		amount: formatCurrency(invoice.amount_paid, invoice.currency),
		status: formatStatus(invoice.status),
		invoicePdf: invoice.invoice_pdf,
		hostedUrl: invoice.hosted_invoice_url
	}
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const billingKeys = {
	all: ['billing'] as const,
	invoices: () => [...billingKeys.all, 'invoices'] as const,
	history: () => [...billingKeys.all, 'history'] as const,
	historyBySubscription: (subscriptionId: string) =>
		[...billingKeys.all, 'history', 'subscription', subscriptionId] as const,
	failed: () => [...billingKeys.all, 'failed'] as const,
	failedBySubscription: (subscriptionId: string) =>
		[...billingKeys.all, 'failed', subscriptionId] as const,
	subscriptionStatus: () => [...billingKeys.all, 'subscription-status'] as const
}

export const subscriptionsKeys = {
	all: ['subscriptions'] as const,
	list: () => [...subscriptionsKeys.all, 'list'] as const,
	detail: (id: string) => [...subscriptionsKeys.all, 'detail', id] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const billingQueries = {
	invoices: () =>
		queryOptions({
			queryKey: billingKeys.invoices(),
			queryFn: async (): Promise<FormattedInvoice[]> => {
				const response = await apiRequest<{ invoices: StripeInvoice[] }>(
					'/api/v1/stripe/invoices'
				)
				return response.invoices.map(formatInvoice)
			},
			staleTime: 5 * 60 * 1000
		}),

	history: () =>
		queryOptions({
			queryKey: billingKeys.history(),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const response = await apiRequest<{ payments: BillingHistoryItem[] }>(
					'/api/v1/rent-payments/history'
				)
				return response.payments
			},
			staleTime: 60 * 1000
		}),

	historyBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.historyBySubscription(subscriptionId),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const response = await apiRequest<{ payments: BillingHistoryItem[] }>(
					`/api/v1/rent-payments/history/subscription/${subscriptionId}`
				)
				return response.payments
			},
			enabled: !!subscriptionId,
			staleTime: 60 * 1000
		}),

	failed: () =>
		queryOptions({
			queryKey: billingKeys.failed(),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const response = await apiRequest<{
					failedAttempts: FailedPaymentAttempt[]
				}>('/api/v1/rent-payments/failed-attempts')
				return response.failedAttempts
			},
			staleTime: 30 * 1000
		}),

	failedBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.failedBySubscription(subscriptionId),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const response = await apiRequest<{
					failedAttempts: FailedPaymentAttempt[]
				}>(
					`/api/v1/rent-payments/failed-attempts/subscription/${subscriptionId}`
				)
				return response.failedAttempts
			},
			enabled: !!subscriptionId,
			staleTime: 30 * 1000
		})
}

// ============================================================================
// INVOICE HOOKS
// ============================================================================

export function useInvoices() {
	return useQuery(billingQueries.invoices())
}

// ============================================================================
// BILLING HISTORY HOOKS
// ============================================================================

export function useBillingHistory() {
	return useQuery(billingQueries.history())
}

export function useSubscriptionBillingHistory(subscriptionId: string) {
	return useQuery(billingQueries.historyBySubscription(subscriptionId))
}

export function useFailedPaymentAttempts() {
	return useQuery(billingQueries.failed())
}

export function useSubscriptionFailedAttempts(subscriptionId: string) {
	return useQuery(billingQueries.failedBySubscription(subscriptionId))
}

// ============================================================================
// SUBSCRIPTION STATUS HOOK
// ============================================================================

export function useSubscriptionStatus(options: { enabled?: boolean } = {}) {
	const { enabled = true } = options

	return useQuery<SubscriptionStatusResponse>({
		queryKey: billingKeys.subscriptionStatus(),
		queryFn: async () => {
			try {
				const response = await fetch(
					`${getApiBaseUrl()}/api/v1/stripe/subscription-status`,
					{
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include'
					}
				)

				if (!response.ok) {
					if (response.status === 401) {
						logger.warn('Subscription status check failed: Unauthorized')
						throw new Error('Authentication required')
					}
					throw new Error(
						`Subscription verification failed: ${response.statusText}`
					)
				}

				const data = await response.json()
				logger.debug('Subscription status verified', {
					status: data.subscriptionStatus
				})
				return data
			} catch (error) {
				logger.error('Failed to verify subscription status', { error })
				throw error
			}
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		enabled
	})
}

// ============================================================================
// SUBSCRIPTION CRUD HOOKS
// ============================================================================

export function useSubscriptions() {
	return useQuery({
		queryKey: subscriptionsKeys.list(),
		queryFn: async (): Promise<RentSubscriptionResponse[]> => {
			const response = await apiRequest<{
				subscriptions: RentSubscriptionResponse[]
			}>('/api/v1/subscriptions')
			return response.subscriptions
		},
		staleTime: 30 * 1000
	})
}

export function useSubscription(id: string) {
	return useQuery({
		queryKey: subscriptionsKeys.detail(id),
		queryFn: () =>
			apiRequest<RentSubscriptionResponse>(`/api/v1/subscriptions/${id}`),
		enabled: !!id
	})
}

export function useCreateSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.create,
		mutationFn: (data: CreateRentSubscriptionRequest) =>
			apiRequest<RentSubscriptionResponse>('/api/v1/subscriptions', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (created: RentSubscriptionResponse) => {
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? [created, ...old] : [created])
			)
			handleMutationSuccess(
				'Create subscription',
				'Your rent will be automatically charged each month'
			)
		},
		onError: error => handleMutationError(error, 'Create subscription')
	})
}

export function useUpdateSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.update,
		mutationFn: ({
			id,
			data
		}: {
			id: string
			data: UpdateSubscriptionRequest
		}) =>
			apiRequest<RentSubscriptionResponse>(`/api/v1/subscriptions/${id}`, {
				method: 'PUT',
				body: JSON.stringify(data)
			}),
		onSuccess: (updated: RentSubscriptionResponse, variables) => {
			queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
				subscriptionsKeys.list(),
				old => (old ? old.map(s => (s.id === updated.id ? updated : s)) : old)
			)
			queryClient.setQueryData<RentSubscriptionResponse | undefined>(
				subscriptionsKeys.detail(variables.id),
				updated
			)
			handleMutationSuccess('Update subscription')
		},
		onError: error => handleMutationError(error, 'Update subscription')
	})
}

export function usePauseSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.pause,
		mutationFn: (id: string) =>
			apiRequest<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}/pause`,
				{ method: 'POST' }
			),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old =>
						old
							? old.map(s =>
									s.id === res.subscription!.id ? res.subscription! : s
								)
							: old
				)
			}
			handleMutationSuccess(
				'Pause subscription',
				'No charges will be made until you resume'
			)
		},
		onError: error => handleMutationError(error, 'Pause subscription')
	})
}

export function useResumeSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.resume,
		mutationFn: (id: string) =>
			apiRequest<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}/resume`,
				{ method: 'POST' }
			),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old =>
						old
							? old.map(s =>
									s.id === res.subscription!.id ? res.subscription! : s
								)
							: old
				)
			}
			handleMutationSuccess(
				'Resume subscription',
				'Automatic payments will continue'
			)
		},
		onError: error => handleMutationError(error, 'Resume subscription')
	})
}

export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.cancel,
		mutationFn: (id: string) =>
			apiRequest<{ subscription?: RentSubscriptionResponse }>(
				`/api/v1/subscriptions/${id}`,
				{ method: 'DELETE' }
			),
		onSuccess: res => {
			if (res.subscription) {
				queryClient.setQueryData<RentSubscriptionResponse[] | undefined>(
					subscriptionsKeys.list(),
					old => (old ? old.filter(s => s.id !== res.subscription!.id) : old)
				)
			}
			handleMutationSuccess(
				'Cancel subscription',
				'You will not be charged after the current period ends'
			)
		},
		onError: error => handleMutationError(error, 'Cancel subscription')
	})
}

export function useActiveSubscriptions(): RentSubscriptionResponse[] {
	const { data: subscriptions } = useSubscriptions()
	return subscriptions?.filter(s => s.status === 'active') || []
}

export function useHasActiveSubscription(lease_id?: string): boolean {
	const { data: subscriptions } = useSubscriptions()
	if (!lease_id || !subscriptions) return false
	return subscriptions.some(
		s => s.leaseId === lease_id && s.status === 'active'
	)
}

// Re-export legacy key names for backwards compatibility during migration
export const billingHistoryKeys = billingKeys
export const billingHistoryQueries = billingQueries
