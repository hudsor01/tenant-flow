'use client'

/**
 * Tenant Payment Hooks — payment queries, amount due, rent checkout
 */

import { queryOptions, useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { DEFAULT_RETRY_ATTEMPTS } from '#shared/types/api-contracts'
import type {
	CreateRentCheckoutResponse,
	RentCheckoutError
} from '#shared/types/api-contracts'
import { tenantPortalKeys } from './use-tenant-portal-keys'

export interface TenantPayment {
	id: string
	amount: number
	status: string
	paidAt: string | null
	dueDate: string
	created_at: string
	lease_id: string
	tenant_id: string
	stripePaymentIntentId: string | null
	ownerReceives: number
	receiptUrl: string | null
}

export interface AmountDueResponse {
	base_rent_cents: number
	late_fee_cents: number
	total_due_cents: number
	due_date: string
	days_late: number
	grace_period_days: number
	already_paid: boolean
	charges_enabled: boolean
	rent_due_id: string | null
	breakdown: Array<{
		description: string
		amount_cents: number
	}>
}

export interface PayRentRequest {
	payment_method_id: string
	amount_cents: number
}

export interface PayRentResponse {
	success: boolean
	payment_id: string
	status: string
	message: string
}

export const tenantPaymentQueries = {
	amountDue: () =>
		queryOptions({
			queryKey: tenantPortalKeys.amountDue(),
			queryFn: async (): Promise<AmountDueResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const defaultResponse: AmountDueResponse = {
					base_rent_cents: 0,
					late_fee_cents: 0,
					total_due_cents: 0,
					due_date: new Date().toISOString().split('T')[0]!,
					days_late: 0,
					grace_period_days: 5,
					already_paid: false,
					charges_enabled: false,
					rent_due_id: null,
					breakdown: []
				}

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return defaultResponse

				const { data: lease } = await supabase
					.from('leases')
					.select('id, rent_amount, owner_user_id, lease_tenants!inner(tenant_id, responsibility_percentage)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				const leaseRaw = lease as {
					id: string
					rent_amount: number | null
					owner_user_id: string
					lease_tenants: Array<{ tenant_id: string; responsibility_percentage: number | null }>
				} | null
				const responsibilityPct = leaseRaw?.lease_tenants?.[0]?.responsibility_percentage ?? 100
				const fullRent = lease ? (lease.rent_amount ?? 0) : 0
				const tenantPortion = fullRent * responsibilityPct / 100
				const baseRentCents = Math.round(tenantPortion * 100)

				if (!lease) {
					return {
						...defaultResponse,
						base_rent_cents: baseRentCents,
						total_due_cents: baseRentCents,
						breakdown: baseRentCents > 0
							? [{ description: 'Base rent', amount_cents: baseRentCents }]
							: []
					}
				}

				const leaseOwnerUserId = leaseRaw!.owner_user_id
				const { data: connectedAccount } = await supabase
					.from('stripe_connected_accounts')
					.select('charges_enabled')
					.eq('user_id', leaseOwnerUserId)
					.maybeSingle()

				const chargesEnabled = connectedAccount?.charges_enabled ?? false

				const today = new Date().toISOString().split('T')[0]!
				const { data: rentDueRecord } = await supabase
					.from('rent_due')
					.select('id, amount, due_date, status')
					.eq('lease_id', lease.id)
					.gte('due_date', today)
					.order('due_date')
					.limit(1)
					.maybeSingle()

				let alreadyPaid = false
				if (rentDueRecord) {
					const { data: existingPayment } = await supabase
						.from('rent_payments')
						.select('id')
						.eq('rent_due_id', rentDueRecord.id)
						.eq('status', 'succeeded')
						.maybeSingle()
					alreadyPaid = !!existingPayment
				}

				if (rentDueRecord) {
					const rentDueCents = Math.round(rentDueRecord.amount * 100)
					const dueDate = new Date(rentDueRecord.due_date)
					const todayDate = new Date()
					const daysLate = Math.max(
						0,
						Math.floor(
							(todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
						)
					)
					return {
						base_rent_cents: rentDueCents,
						late_fee_cents: 0,
						total_due_cents: rentDueCents,
						due_date: rentDueRecord.due_date,
						days_late: daysLate,
						grace_period_days: 5,
						already_paid: alreadyPaid,
						charges_enabled: chargesEnabled,
						rent_due_id: rentDueRecord.id,
						breakdown: [
							{ description: 'Base rent', amount_cents: rentDueCents }
						]
					}
				}

				return {
					base_rent_cents: baseRentCents,
					late_fee_cents: 0,
					total_due_cents: baseRentCents,
					due_date: today,
					days_late: 0,
					grace_period_days: 5,
					already_paid: false,
					charges_enabled: chargesEnabled,
					rent_due_id: null,
					breakdown: [{ description: 'Base rent', amount_cents: baseRentCents }]
				}
			},
			...QUERY_CACHE_TIMES.STATS,
			refetchInterval: 2 * 60 * 1000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: 'always'
		}),

	payments: () =>
		queryOptions({
			queryKey: tenantPortalKeys.payments.all(),
			queryFn: async (): Promise<{ payments: TenantPayment[] }> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return { payments: [] }

				const { data: lease } = await supabase
					.from('leases')
					.select('id, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				if (!lease) return { payments: [] }

				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, paid_date, due_date, created_at, lease_id')
					.eq('lease_id', lease.id)
					.order('due_date', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				const payments: TenantPayment[] = (data ?? []).map(row => ({
					id: row.id,
					amount: row.amount,
					status: row.status,
					paidAt: row.paid_date,
					dueDate: row.due_date,
					created_at: row.created_at,
					lease_id: row.lease_id,
					tenant_id: tenantRecord.id,
					stripePaymentIntentId: null,
					ownerReceives: row.amount,
					receiptUrl: null
				}))

				return { payments }
			},
			...QUERY_CACHE_TIMES.LIST,
			refetchOnWindowFocus: 'always',
			retry: DEFAULT_RETRY_ATTEMPTS
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useTenantPayments() {
	return useQuery(tenantPaymentQueries.payments())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useRentCheckoutMutation() {
	return useMutation({
		mutationKey: mutationKeys.tenantPortal.payRent,
		mutationFn: async (rentDueId: string): Promise<CreateRentCheckoutResponse> => {
			const supabase = createClient()
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.access_token) throw new Error('Not authenticated')

			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const response = await fetch(`${supabaseUrl}/functions/v1/stripe-rent-checkout`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ rent_due_id: rentDueId }),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Payment service unavailable' }))
				throw new Error((errorData as RentCheckoutError).error ?? 'Failed to start checkout')
			}

			return response.json() as Promise<CreateRentCheckoutResponse>
		},
		onSuccess: (data) => {
			if (data.url) {
				window.location.href = data.url
			}
		},
		onError: (error) => {
			handleMutationError(error, 'Start rent payment')
		},
	})
}
