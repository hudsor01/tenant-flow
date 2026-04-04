/**
 * Billing & Subscription Query Keys, Options & Mutations
 * Query and mutation factories for billing/subscription domain.
 *
 * Contains:
 * - billingKeys: cache key factories for billing/invoices/history
 * - subscriptionsKeys: cache key factories for subscription CRUD
 * - billingQueries: queryOptions factories for billing data fetching
 * - billingMutations: mutationOptions factories for subscription management
 */

import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createLogger } from '#lib/frontend-logger'
import { mutationKeys } from '../mutation-keys'
import type {
	BillingHistoryItem,
	CreateRentSubscriptionRequest,
	FailedPaymentAttempt,
	RentSubscriptionResponse,
	SubscriptionStatusResponse,
	UpdateSubscriptionRequest
} from '#types/api-contracts'

const logger = createLogger({ component: 'BillingKeys' })

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
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				// Try get_user_invoices RPC (queries stripe.invoices via SECURITY DEFINER)
				const { data: rpcData, error: rpcError } = await supabase
					.rpc('get_user_invoices', { p_limit: 50 })

				if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
					return rpcData.map((row: Record<string, unknown>) => ({
						id: row.invoice_id as string,
						date: row.created_at as string,
						amount: String(row.amount_due),
						status: row.status as string,
						invoicePdf: (row.invoice_pdf as string) ?? null,
						hostedUrl: (row.hosted_invoice_url as string) ?? null
					}))
				}

				if (rpcError) {
					logger.debug('get_user_invoices RPC not available, falling back to rent_payments', {
						error: rpcError.message
					})
				}

				// Fall back to rent_payments as invoice proxy
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, due_date, paid_date, created_at')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					date: row.created_at,
					amount: String(row.amount),
					status: row.status,
					invoicePdf: null,
					hostedUrl: null
				}))
			},
			staleTime: 5 * 60 * 1000
		}),

	history: () =>
		queryOptions({
			queryKey: billingKeys.history(),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, currency, status, due_date, paid_date, created_at, lease_id, tenant_id')
					.order('created_at', { ascending: false })
					.limit(50)
				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []).map((row): BillingHistoryItem => ({
					id: row.id,
					subscriptionId: '',
					tenant_id: row.tenant_id,
					amount: row.amount,
					currency: row.currency ?? 'USD',
					status: row.status as BillingHistoryItem['status'],
					created_at: row.created_at,
					updated_at: row.created_at,
					formattedAmount: `$${row.amount.toFixed(2)}`,
					formattedDate: new Date(row.created_at).toLocaleDateString(),
					isSuccessful: row.status === 'succeeded'
				}))
			},
			staleTime: 60 * 1000
		}),

	historyBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.historyBySubscription(subscriptionId),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const supabase = createClient()
				// Query rent_payments for the lease with this subscription
				const { data: lease } = await supabase
					.from('leases')
					.select('id')
					.eq('stripe_subscription_id', subscriptionId)
					.limit(1)
					.maybeSingle()

				if (!lease) return []

				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, currency, status, due_date, paid_date, created_at, lease_id, tenant_id')
					.eq('lease_id', lease.id)
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []).map((row): BillingHistoryItem => ({
					id: row.id,
					subscriptionId,
					tenant_id: row.tenant_id,
					amount: row.amount,
					currency: row.currency ?? 'USD',
					status: row.status as BillingHistoryItem['status'],
					created_at: row.created_at,
					updated_at: row.created_at,
					formattedAmount: `$${row.amount.toFixed(2)}`,
					formattedDate: new Date(row.created_at).toLocaleDateString(),
					isSuccessful: row.status === 'succeeded'
				}))
			},
			enabled: !!subscriptionId,
			staleTime: 60 * 1000
		}),

	failed: () =>
		queryOptions({
			queryKey: billingKeys.failed(),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, created_at, lease_id, tenant_id, stripe_payment_intent_id')
					.eq('status', 'failed')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					subscriptionId: '',
					tenant_id: row.tenant_id,
					amount: row.amount,
					failureReason: null,
					stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
					created_at: row.created_at
				}))
			},
			staleTime: 30 * 1000
		}),

	failedBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.failedBySubscription(subscriptionId),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const supabase = createClient()
				const { data: lease } = await supabase
					.from('leases')
					.select('id')
					.eq('stripe_subscription_id', subscriptionId)
					.limit(1)
					.maybeSingle()

				if (!lease) return []

				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, created_at, lease_id, tenant_id, stripe_payment_intent_id')
					.eq('lease_id', lease.id)
					.eq('status', 'failed')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					subscriptionId,
					tenant_id: row.tenant_id,
					amount: row.amount,
					failureReason: null,
					stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
					created_at: row.created_at
				}))
			},
			enabled: !!subscriptionId,
			staleTime: 30 * 1000
		}),

	subscriptionStatus: (options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: billingKeys.subscriptionStatus(),
			queryFn: async (): Promise<SubscriptionStatusResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					logger.warn('Subscription status check: no user')
					throw new Error('Not authenticated')
				}

				// Get stripe_customer_id from users table
				const { data: userData, error: userError } = await supabase
					.from('users')
					.select('stripe_customer_id')
					.eq('id', user.id)
					.single()

				if (userError) handlePostgrestError(userError, 'users')

				const stripeCustomerId = userData?.stripe_customer_id ?? null

				if (!stripeCustomerId) {
					logger.debug('No stripe_customer_id, returning null status')
					return {
						subscriptionStatus: null,
						stripeCustomerId: null,
						stripePriceId: null,
						currentPeriodEnd: null,
						cancelAtPeriodEnd: false
					} satisfies SubscriptionStatusResponse
				}

				// Query stripe.subscriptions for real subscription status
				const { data: subData, error: subError } = await supabase
					.rpc('get_subscription_status', { p_customer_id: stripeCustomerId })

				if (subError) {
					logger.debug('get_subscription_status RPC not available, falling back to leases', {
						error: subError.message
					})

					const { data: leaseData } = await supabase
						.from('leases')
						.select('stripe_subscription_status')
						.eq('owner_user_id', user.id)
						.not('stripe_subscription_id', 'is', null)
						.order('created_at', { ascending: false })
						.limit(1)
						.maybeSingle()

					const leaseStatus = leaseData?.stripe_subscription_status as string | null

					return {
						subscriptionStatus: (leaseStatus ?? null) as SubscriptionStatusResponse['subscriptionStatus'],
						stripeCustomerId,
						stripePriceId: null,
						currentPeriodEnd: null,
						cancelAtPeriodEnd: false
					} satisfies SubscriptionStatusResponse
				}

				const sub = (Array.isArray(subData) ? subData[0] : subData) as Record<string, unknown> | null

				const status = (sub?.status as string) ?? null
				logger.debug('Subscription status from stripe.subscriptions', { status })

				return {
					subscriptionStatus: status as SubscriptionStatusResponse['subscriptionStatus'],
					stripeCustomerId,
					stripePriceId: (sub?.price_id as string) ?? null,
					currentPeriodEnd: (sub?.current_period_end as string) ?? null,
					cancelAtPeriodEnd: (sub?.cancel_at_period_end as boolean) ?? false
				} satisfies SubscriptionStatusResponse
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: options?.enabled ?? true
		})
}

/**
 * Subscription query options for rent subscriptions (lease-based)
 */
export const subscriptionQueries = {
	list: () =>
		queryOptions({
			queryKey: subscriptionsKeys.list(),
			queryFn: async (): Promise<RentSubscriptionResponse[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('id, stripe_subscription_id, stripe_subscription_status, rent_amount, rent_currency, primary_tenant_id, unit_id')
					.not('stripe_subscription_id', 'is', null)
					.order('created_at', { ascending: false })
				if (error) handlePostgrestError(error, 'leases')
				return (data ?? []).map((row): RentSubscriptionResponse => ({
					id: row.id,
					leaseId: row.id,
					tenantId: row.primary_tenant_id ?? '',
					ownerId: '',
					stripeSubscriptionId: row.stripe_subscription_id ?? '',
					stripeCustomerId: '',
					amount: row.rent_amount ?? undefined,
					currency: row.rent_currency ?? 'USD',
					billingDayOfMonth: 1,
					status: row.stripe_subscription_status ?? 'unknown',
					platformFeePercentage: 0,
					createdAt: '',
					updatedAt: ''
				}))
			},
			staleTime: 30 * 1000
		}),

	detail: (id: string) =>
		queryOptions({
			queryKey: subscriptionsKeys.detail(id),
			queryFn: async (): Promise<RentSubscriptionResponse> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('id, stripe_subscription_id, stripe_subscription_status, rent_amount, rent_currency, primary_tenant_id, unit_id')
					.eq('id', id)
					.single()
				if (error) handlePostgrestError(error, 'leases')
				const row = data!
				return {
					id: row.id,
					leaseId: row.id,
					tenantId: row.primary_tenant_id ?? '',
					ownerId: '',
					stripeSubscriptionId: row.stripe_subscription_id ?? '',
					stripeCustomerId: '',
					amount: row.rent_amount ?? undefined,
					currency: row.rent_currency ?? 'USD',
					billingDayOfMonth: 1,
					status: row.stripe_subscription_status ?? 'unknown',
					platformFeePercentage: 0,
					createdAt: '',
					updatedAt: ''
				} satisfies RentSubscriptionResponse
			},
			enabled: !!id
		})
}

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
