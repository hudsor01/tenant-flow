/**
 * Billing & Subscription Query Keys and Query Options
 * Extracted from use-billing.ts for the query-keys/ convention.
 *
 * Contains:
 * - billingKeys: cache key factories for billing/invoices/history
 * - subscriptionsKeys: cache key factories for subscription CRUD
 * - billingQueries: queryOptions factories for billing data fetching
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createLogger } from '#lib/frontend-logger'
import type {
	BillingHistoryItem,
	FailedPaymentAttempt
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
		})
}
