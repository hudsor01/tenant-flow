'use client'

/**
 * Tenant Portal Hooks & Query Options
 * TanStack Query hooks for tenant-facing operations with colocated query options
 *
 * Architecture:
 * - PostgREST direct via supabase-js (no apiRequest calls)
 * - Two-step tenant resolution: auth.uid() → tenants.id before any tenant-scoped query
 * - RLS enforces access: authenticated tenant only sees their own data
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { DEFAULT_RETRY_ATTEMPTS } from '@repo/shared/types/api-contracts'
import { logger } from '@repo/shared/lib/frontend-logger'
import { toast } from 'sonner'
import type {
	MaintenanceCategory,
	MaintenancePriority
} from '@repo/shared/types/core'
import type {
	CreateRentCheckoutResponse,
	RentCheckoutError
} from '@repo/shared/types/api-contracts'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tenant payment entity
 */
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

export interface TenantAutopayStatus {
	autopayEnabled: boolean
	subscriptionId: string | null
	subscriptionStatus?: string | null
	lease_id?: string
	tenant_id?: string
	rent_amount?: number
	nextPaymentDate?: string | null
	message?: string
}

export interface TenantMaintenanceRequest {
	id: string
	title: string
	description: string | null
	priority: MaintenancePriority
	status: string
	category: MaintenanceCategory | null
	created_at: string
	updated_at: string | null
	completed_at: string | null
	requestedBy: string
	unit_id: string
}

export interface TenantMaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
}

export interface TenantLease {
	id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number | null
	status: string
	lease_status: string
	stripe_subscription_id: string | null
	lease_document_url: string | null
	created_at: string
	// Signature tracking fields
	owner_signed_at: string | null
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	unit: {
		id: string
		unit_number: string
		bedrooms: number
		bathrooms: number
		property: {
			id: string
			name: string
			address: string
			city: string
			state: string
			postal_code: string
		}
	} | null
	metadata: {
		documentUrl: string | null
	}
}

export interface TenantDocument {
	id: string
	type: 'LEASE' | 'RECEIPT'
	name: string
	url: string | null
	created_at: string | null
}

export interface TenantProfile {
	id: string
	first_name: string | null
	last_name: string | null
	email: string | null
	phone: string | null
}

export interface TenantSettings {
	profile: TenantProfile
}

/**
 * Tenant-specific notification preferences
 * Used by tenant portal for self-management of preferences
 */
export interface TenantNotificationPreferences {
	rentReminders: boolean
	maintenanceUpdates: boolean
	propertyNotices: boolean
	emailNotifications: boolean
	smsNotifications: boolean
}

export interface MaintenanceRequestCreate {
	title: string
	description: string
	priority: MaintenancePriority
	category?: MaintenanceCategory
	allowEntry: boolean
	photos?: string[]
}

/**
 * Amount due response type
 */
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

/**
 * Pay rent request type
 */
export interface PayRentRequest {
	payment_method_id: string
	amount_cents: number
}

/**
 * Pay rent response type
 */
export interface PayRentResponse {
	success: boolean
	payment_id: string
	status: string
	message: string
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Tenant portal query keys for cache management
 */
export const tenantPortalKeys = {
	all: ['tenant-portal'] as const,
	dashboard: () => [...tenantPortalKeys.all, 'dashboard'] as const,
	amountDue: () => [...tenantPortalKeys.all, 'amount-due'] as const,
	payments: {
		all: () => [...tenantPortalKeys.all, 'payments'] as const
	},
	autopay: {
		all: () => [...tenantPortalKeys.all, 'autopay'] as const,
		status: () => [...tenantPortalKeys.all, 'autopay'] as const
	},
	maintenance: {
		all: () => [...tenantPortalKeys.all, 'maintenance'] as const,
		list: () => [...tenantPortalKeys.all, 'maintenance'] as const
	},
	leases: {
		all: () => [...tenantPortalKeys.all, 'lease'] as const
	},
	documents: {
		all: () => [...tenantPortalKeys.all, 'documents'] as const
	},
	settings: {
		all: () => [...tenantPortalKeys.all, 'settings'] as const
	},
	notificationPreferences: {
		all: () => [...tenantPortalKeys.all, 'notification-preferences'] as const,
		detail: () => [...tenantPortalKeys.all, 'notification-preferences', 'detail'] as const
	}
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Tenant portal query factory
 *
 * Cache Strategy:
 * - STATS (1 min staleTime): Amount due - needs frequent updates
 * - LIST (10 min staleTime): Payments, maintenance - moderate freshness
 * - DETAIL (5 min staleTime): Dashboard, autopay, lease, documents, settings
 *
 * Refetch Strategy:
 * - refetchOnWindowFocus: false - staleTime handles freshness
 * - refetchInterval: Only for critical real-time data (amount due)
 * - refetchIntervalInBackground: false - save resources when tab inactive
 */
export const tenantPortalQueries = {
	/**
	 * Base key for all tenant portal queries
	 */
	all: () => ['tenant-portal'] as const,

	/**
	 * Dashboard data — fetches active lease for tenant
	 */
	dashboard: () =>
		queryOptions({
			queryKey: tenantPortalKeys.dashboard(),
			queryFn: async () => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return { lease: null, stats: {} }

				const { data, error } = await supabase
					.from('leases')
					.select(
						'id, start_date, end_date, rent_amount, lease_status, units!inner(unit_number, property_id, properties!inner(name, address_line1, city, state, postal_code)), lease_tenants!inner(tenant_id)'
					)
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				// PGRST116 = no rows returned (tenant has no active lease)
				if (error && error.code !== 'PGRST116')
					handlePostgrestError(error, 'leases')

				return { lease: data, stats: {} }
			},
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false
		}),

	/**
	 * Amount due for current period
	 * Primary: SSE push via 'payment.status_updated' event
	 * Fallback: 2 min polling for critical payment data
	 */
	amountDue: () =>
		queryOptions({
			queryKey: tenantPortalKeys.amountDue(),
			queryFn: async (): Promise<AmountDueResponse> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
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

				// Step 1: Get tenant record
				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return defaultResponse

				// Step 2: Get active lease to resolve leaseId, rent_amount, and owner_user_id
				const { data: lease } = await supabase
					.from('leases')
					.select('id, rent_amount, owner_user_id, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				const baseRentCents = lease ? (lease.rent_amount ?? 0) * 100 : 0

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

				// Step 3: Resolve owner's connected account charges_enabled status
				const leaseOwnerUserId = (lease as unknown as Record<string, unknown>).owner_user_id as string
				const { data: connectedAccount } = await supabase
					.from('stripe_connected_accounts')
					.select('charges_enabled')
					.eq('user_id', leaseOwnerUserId)
					.maybeSingle()

				const chargesEnabled = connectedAccount?.charges_enabled ?? false

				// Step 4: Query rent_due for the current/next period
				const today = new Date().toISOString().split('T')[0]!
				const { data: rentDueRecord } = await supabase
					.from('rent_due')
					.select('id, amount, due_date, status')
					.eq('lease_id', lease.id)
					.gte('due_date', today)
					.order('due_date')
					.limit(1)
					.maybeSingle()

				// Step 5: Check if already paid for this rent_due period
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

				// No rent_due record — fall back to lease rent_amount
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
			refetchInterval: 2 * 60 * 1000, // Fallback: 2 min polling (SSE is primary)
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true // Catch missed events on tab focus
		}),

	/**
	 * Payment history and upcoming payments
	 */
	payments: () =>
		queryOptions({
			queryKey: tenantPortalKeys.payments.all(),
			queryFn: async (): Promise<{ payments: TenantPayment[] }> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				// Step 1: Get tenant record
				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return { payments: [] }

				// Step 2: Get active lease
				const { data: lease } = await supabase
					.from('leases')
					.select('id, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				if (!lease) return { payments: [] }

				// Step 3: Get payments for this lease
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount_cents, status, paid_at, due_date, created_at, lease_id')
					.eq('lease_id', lease.id)
					.order('due_date', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				const payments: TenantPayment[] = (data ?? []).map(row => ({
					id: row.id,
					amount: row.amount_cents / 100,
					status: row.status,
					paidAt: row.paid_at,
					dueDate: row.due_date,
					created_at: row.created_at,
					lease_id: row.lease_id,
					tenant_id: tenantRecord.id,
					stripePaymentIntentId: null,
					ownerReceives: row.amount_cents / 100,
					receiptUrl: null
				}))

				return { payments }
			},
			...QUERY_CACHE_TIMES.LIST,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Autopay/subscription status for active lease
	 */
	autopay: () =>
		queryOptions({
			queryKey: tenantPortalKeys.autopay.all(),
			queryFn: async (): Promise<TenantAutopayStatus> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) {
					return { autopayEnabled: false, subscriptionId: null }
				}

				const { data: lease } = await supabase
					.from('leases')
					.select('id, stripe_subscription_id, rent_amount, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				if (!lease) {
					return { autopayEnabled: false, subscriptionId: null }
				}

				return {
					autopayEnabled: !!lease.stripe_subscription_id,
					subscriptionId: lease.stripe_subscription_id,
					subscriptionStatus: lease.stripe_subscription_id ? 'active' : null,
					lease_id: lease.id,
					tenant_id: tenantRecord.id,
					rent_amount: lease.rent_amount
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Maintenance request history with summary stats
	 * Two-step resolution: auth.uid() → tenants.id → maintenance_requests.tenant_id
	 */
	maintenance: () =>
		queryOptions({
			queryKey: tenantPortalKeys.maintenance.all(),
			queryFn: async (): Promise<{
				requests: TenantMaintenanceRequest[]
				summary: TenantMaintenanceStats
			}> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user)
					return {
						requests: [],
						summary: { total: 0, open: 0, inProgress: 0, completed: 0 }
					}

				// Step 1: Resolve tenants.id from auth.uid()
				// maintenance_requests.tenant_id references tenants.id, not auth.uid()
				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) {
					return {
						requests: [],
						summary: { total: 0, open: 0, inProgress: 0, completed: 0 }
					}
				}

				// Step 2: Filter maintenance_requests by tenants.id
				const { data, error, count } = await supabase
					.from('maintenance_requests')
					.select(
						'id, title, description, priority, status, created_at, updated_at, completed_at, unit_id, requested_by',
						{ count: 'exact' }
					)
					.eq('tenant_id', tenantRecord.id)
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'maintenance_requests')

				const rows = data ?? []
				const requests: TenantMaintenanceRequest[] = rows.map(row => ({
					id: row.id,
					title: row.title,
					description: row.description,
					priority: row.priority as MaintenancePriority,
					status: row.status,
					category: null,
					created_at: row.created_at,
					updated_at: row.updated_at,
					completed_at: row.completed_at,
					requestedBy: row.requested_by ?? '',
					unit_id: row.unit_id
				}))

				const total = count ?? 0
				const open = requests.filter(
					r => r.status === 'open' || r.status === 'assigned'
				).length
				const inProgress = requests.filter(
					r =>
						r.status === 'in_progress' || r.status === 'needs_reassignment'
				).length
				const completed = requests.filter(r => r.status === 'completed').length

				return { requests, summary: { total, open, inProgress, completed } }
			},
			...QUERY_CACHE_TIMES.LIST,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Active lease with unit/property metadata
	 */
	lease: () =>
		queryOptions({
			queryKey: tenantPortalKeys.leases.all(),
			queryFn: async (): Promise<TenantLease | null> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return null

				const { data, error } = await supabase
					.from('leases')
					.select(
						'id, start_date, end_date, rent_amount, security_deposit, lease_status, stripe_subscription_id, lease_document_url, created_at, owner_signed_at, tenant_signed_at, sent_for_signature_at, units!inner(id, unit_number, bedrooms, bathrooms, properties!inner(id, name, address_line1, city, state, postal_code)), lease_tenants!inner(tenant_id)'
					)
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				if (error) {
					// PGRST116 = no rows (tenant has no active lease)
					if (error.code === 'PGRST116') return null
					handlePostgrestError(error, 'leases')
				}

				if (!data) return null

				// Supabase join returns relations as arrays even with !inner
				const raw = data as unknown as {
					id: string
					start_date: string
					end_date: string
					rent_amount: number
					security_deposit: number | null
					lease_status: string
					stripe_subscription_id: string | null
					lease_document_url: string | null
					created_at: string
					owner_signed_at: string | null
					tenant_signed_at: string | null
					sent_for_signature_at: string | null
					units: Array<{
						id: string
						unit_number: string
						bedrooms: number
						bathrooms: number
						properties: Array<{
							id: string
							name: string
							address_line1: string
							city: string
							state: string
							postal_code: string
						}>
					}>
					lease_tenants: Array<{ tenant_id: string }>
				}

				const rawUnit = raw.units?.[0]
				const rawProperty = rawUnit?.properties?.[0]

				return {
					id: raw.id,
					start_date: raw.start_date,
					end_date: raw.end_date,
					rent_amount: raw.rent_amount,
					security_deposit: raw.security_deposit,
					status: raw.lease_status,
					lease_status: raw.lease_status,
					stripe_subscription_id: raw.stripe_subscription_id,
					lease_document_url: raw.lease_document_url,
					created_at: raw.created_at,
					owner_signed_at: raw.owner_signed_at,
					tenant_signed_at: raw.tenant_signed_at,
					sent_for_signature_at: raw.sent_for_signature_at,
					unit:
						rawUnit && rawProperty
							? {
									id: rawUnit.id,
									unit_number: rawUnit.unit_number,
									bedrooms: rawUnit.bedrooms,
									bathrooms: rawUnit.bathrooms,
									property: {
										id: rawProperty.id,
										name: rawProperty.name,
										address: rawProperty.address_line1,
										city: rawProperty.city,
										state: rawProperty.state,
										postal_code: rawProperty.postal_code
									}
								}
							: null,
					metadata: {
						documentUrl: raw.lease_document_url
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Lease documents (signed agreement, receipts)
	 */
	documents: () =>
		queryOptions({
			queryKey: tenantPortalKeys.documents.all(),
			queryFn: async (): Promise<{ documents: TenantDocument[] }> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				const { data: tenantRecord } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (!tenantRecord) return { documents: [] }

				const { data, error } = await supabase
					.from('leases')
					.select('id, lease_document_url, created_at, lease_tenants!inner(tenant_id)')
					.eq('lease_tenants.tenant_id', tenantRecord.id)
					.eq('lease_status', 'active')
					.single()

				if (error) {
					if (error.code === 'PGRST116') return { documents: [] }
					handlePostgrestError(error, 'leases')
				}

				if (!data) return { documents: [] }

				const documents: TenantDocument[] = [
					{
						id: (data as Record<string, unknown>).id as string,
						type: 'LEASE',
						name: 'Lease Agreement',
						url: (data as Record<string, unknown>).lease_document_url as string | null,
						created_at: (data as Record<string, unknown>).created_at as string
					}
				]

				return { documents }
			},
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Tenant profile and settings
	 */
	settings: () =>
		queryOptions({
			queryKey: tenantPortalKeys.settings.all(),
			queryFn: async (): Promise<TenantSettings> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				// Get tenant profile from tenants table
				const { data: tenantData } = await supabase
					.from('tenants')
					.select('id, first_name, last_name, email, phone')
					.eq('user_id', user.id)
					.single()

				return {
					profile: {
						id: user.id,
						first_name: (tenantData as Record<string, unknown> | null)?.first_name as string | null ?? null,
						last_name: (tenantData as Record<string, unknown> | null)?.last_name as string | null ?? null,
						email: user.email ?? null,
						phone: (tenantData as Record<string, unknown> | null)?.phone as string | null ?? null
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Tenant notification preferences (self-managed by tenant)
	 * Uses authenticated context - no tenant ID needed in URL
	 */
	notificationPreferences: () =>
		queryOptions({
			queryKey: tenantPortalKeys.notificationPreferences.detail(),
			queryFn: async (): Promise<TenantNotificationPreferences> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (!user) throw new Error('Not authenticated')

				const { data } = await supabase
					.from('notification_settings')
					.select(
						'rent_reminders, maintenance_updates, property_notices, email_notifications, sms_notifications'
					)
					.eq('user_id', user.id)
					.single()

				// Return defaults if no row found
				return {
					rentReminders: (data as Record<string, unknown> | null)?.rent_reminders as boolean ?? true,
					maintenanceUpdates: (data as Record<string, unknown> | null)?.maintenance_updates as boolean ?? true,
					propertyNotices: (data as Record<string, unknown> | null)?.property_notices as boolean ?? true,
					emailNotifications: (data as Record<string, unknown> | null)?.email_notifications as boolean ?? true,
					smsNotifications: (data as Record<string, unknown> | null)?.sms_notifications as boolean ?? false
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// ============================================================================
// QUERY HOOKS - PAYMENTS (/tenant-portal/payments/*)
// ============================================================================

/**
 * Get payment history and upcoming payments
 */
export function useTenantPayments() {
	return useQuery(tenantPortalQueries.payments())
}

// ============================================================================
// QUERY HOOKS - AUTOPAY (/tenant-portal/autopay/*)
// ============================================================================

/**
 * Get autopay/subscription status for active lease
 */
export function useTenantAutopayStatus() {
	return useQuery(tenantPortalQueries.autopay())
}

// ============================================================================
// QUERY HOOKS - MAINTENANCE (/tenant-portal/maintenance/*)
// ============================================================================

/**
 * Get maintenance request history with summary stats
 */
export function useTenantMaintenance() {
	return useQuery(tenantPortalQueries.maintenance())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a maintenance request
 */
export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantPortal.createMaintenanceRequest,
		mutationFn: async (request: MaintenanceRequestCreate) => {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			// Step 1: Resolve tenant record
			const { data: tenantRecord, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()

			if (tenantError || !tenantRecord)
				throw new Error('Tenant record not found')

			// Step 2: Get active lease to resolve unit_id and owner_user_id
			const { data: lease, error: leaseError } = await supabase
				.from('leases')
				.select(
					'id, unit_id, owner_user_id, lease_tenants!inner(tenant_id)'
				)
				.eq('lease_tenants.tenant_id', tenantRecord.id)
				.eq('lease_status', 'active')
				.single()

			if (leaseError || !lease) throw new Error('No active lease found')

			const leaseData = lease as Record<string, unknown>

			// Step 3: Insert maintenance request
			const { data, error } = await supabase
				.from('maintenance_requests')
				.insert({
					title: request.title,
					description: request.description,
					priority: request.priority,
					status: 'open',
					tenant_id: tenantRecord.id,
					unit_id: leaseData.unit_id as string,
					owner_user_id: requireOwnerUserId(leaseData.owner_user_id as string | undefined)
				})
				.select('id, title, description, priority, status, created_at, updated_at, completed_at, unit_id, requested_by')
				.single()

			if (error) throw new Error(error.message)

			const row = data as Record<string, unknown>
			return {
				id: row.id as string,
				title: row.title as string,
				description: row.description as string | null,
				priority: row.priority as MaintenancePriority,
				status: row.status as string,
				category: null,
				created_at: row.created_at as string,
				updated_at: row.updated_at as string | null,
				completed_at: row.completed_at as string | null,
				requestedBy: row.requested_by as string ?? '',
				unit_id: row.unit_id as string
			} satisfies TenantMaintenanceRequest
		},
		onSuccess: () => {
			handleMutationSuccess('Maintenance request created successfully')
			// Invalidate maintenance list to refetch with new request
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.maintenance.list()
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Create maintenance request')
		}
	})
}

/**
 * Initiate Stripe Checkout for rent payment
 * Calls stripe-rent-checkout Edge Function and redirects to Stripe
 */
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
			// Redirect to Stripe Checkout
			if (data.url) {
				window.location.href = data.url
			}
		},
		onError: (error) => {
			handleMutationError(error, 'Start rent payment')
		},
	})
}

// ============================================================================
// QUERY HOOKS - LEASES (/tenant-portal/leases/*)
// ============================================================================

/**
 * Combined dashboard hook for tenant portal homepage
 * Returns TanStack Query-compatible result with data property
 */
export function useTenantPortalDashboard() {
	const lease = useTenantLease()
	const payments = useTenantPayments()
	const maintenance = useTenantMaintenance()
	const autopay = useTenantAutopayStatus()

	const isLoading =
		lease.isLoading ||
		payments.isLoading ||
		maintenance.isLoading ||
		autopay.isLoading
	const error =
		lease.error || payments.error || maintenance.error || autopay.error

	return {
		data: {
			lease: lease.data,
			payments: {
				recent: payments.data?.payments.slice(0, 5) || [],
				upcoming: payments.data?.payments.find(p => p.status === 'pending') || null
			},
			maintenance: {
				...maintenance.data?.summary,
				recent: maintenance.data?.requests.slice(0, 5) || []
			},
			autopayStatus: autopay.data
		},
		isLoading,
		error
	}
}

/**
 * Get active lease with unit/property metadata
 */
export function useTenantLease() {
	return useQuery(tenantPortalQueries.lease())
}

/**
 * Get lease documents (signed agreement, receipts)
 */
export function useTenantLeaseDocuments() {
	return useQuery(tenantPortalQueries.documents())
}

// ============================================================================
// QUERY HOOKS - SETTINGS (/tenant-portal/settings/*)
// ============================================================================

/**
 * Get tenant profile and settings
 */
export function useTenantSettings() {
	return useQuery(tenantPortalQueries.settings())
}

// ============================================================================
// QUERY HOOKS - NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get notification preferences for authenticated tenant (self-service)
 * Uses authenticated context - no tenant ID needed
 */
export function useTenantNotificationPreferences() {
	return useQuery(tenantPortalQueries.notificationPreferences())
}

/**
 * Update notification preferences (tenant self-service)
 * Includes optimistic updates with rollback
 * Uses authenticated context - no tenant ID needed
 */
export function useUpdateTenantNotificationPreferences() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantNotificationPreferences.update,
		mutationFn: async (preferences: Partial<TenantNotificationPreferences>) => {
			const supabase = createClient()
			const {
				data: { user }
			} = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('notification_settings')
				.upsert(
					{
						user_id: user.id,
						rent_reminders: preferences.rentReminders,
						maintenance_updates: preferences.maintenanceUpdates,
						property_notices: preferences.propertyNotices,
						email_notifications: preferences.emailNotifications,
						sms_notifications: preferences.smsNotifications
					},
					{ onConflict: 'user_id' }
				)
				.select('rent_reminders, maintenance_updates, property_notices, email_notifications, sms_notifications')
				.single()

			if (error) throw new Error(error.message)

			const row = data as Record<string, unknown>
			return {
				rentReminders: row.rent_reminders as boolean ?? true,
				maintenanceUpdates: row.maintenance_updates as boolean ?? true,
				propertyNotices: row.property_notices as boolean ?? true,
				emailNotifications: row.email_notifications as boolean ?? true,
				smsNotifications: row.sms_notifications as boolean ?? false
			} satisfies TenantNotificationPreferences
		},
		onMutate: async (newPreferences: Partial<TenantNotificationPreferences>) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({
				queryKey: tenantPortalKeys.notificationPreferences.detail()
			})

			// Snapshot previous state
			const previousPreferences =
				queryClient.getQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail()
				)

			// Optimistically update
			if (previousPreferences) {
				queryClient.setQueryData<TenantNotificationPreferences>(
					tenantPortalKeys.notificationPreferences.detail(),
					(old: TenantNotificationPreferences | undefined) =>
						old ? { ...old, ...newPreferences } : undefined
				)
			}

			return { previousPreferences }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousPreferences) {
				queryClient.setQueryData(
					tenantPortalKeys.notificationPreferences.detail(),
					context.previousPreferences
				)
			}

			logger.error('Failed to update notification preferences', {
				action: 'update_notification_preferences',
				metadata: {
					error: err instanceof Error ? err.message : String(err)
				}
			})

			handleMutationError(err, 'Update notification preferences')
		},
		onSuccess: data => {
			// Update cache with server response
			queryClient.setQueryData<TenantNotificationPreferences>(
				tenantPortalKeys.notificationPreferences.detail(),
				data
			)

			handleMutationSuccess(
				'Update notification preferences',
				'Your notification preferences have been saved'
			)

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences'
			})
		}
	})
}

// ============================================================================
// MUTATION HOOKS - AUTOPAY
// ============================================================================

/**
 * Setup autopay for tenant's lease
 * NOTE: Full Stripe autopay implementation is Phase 54. Shows info toast for now.
 */
export function useTenantPortalSetupAutopayMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantAutopay.setup,
		mutationFn: async (_params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			// Autopay setup requires Stripe Connect (Phase 54)
			toast.info('Autopay setup coming soon')
			return { success: false, message: 'Autopay coming soon' }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}

/**
 * Cancel autopay for tenant's lease
 * NOTE: Full Stripe autopay implementation is Phase 54. Shows info toast for now.
 */
export function useTenantPortalCancelAutopayMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantAutopay.cancel,
		mutationFn: async (_params: {
			tenant_id: string
			lease_id: string
			paymentMethodId?: string
		}) => {
			// Autopay cancel requires Stripe Connect (Phase 54)
			toast.info('Autopay cancellation coming soon')
			return { success: false, message: 'Autopay cancellation coming soon' }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.status()
			})
		}
	})
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Invalidate specific tenant portal sections
 */
export function useTenantPortalCacheUtils() {
	const queryClient = useQueryClient()

	return {
		invalidatePayments: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.payments.all()
			})
		},
		invalidateAutopay: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.autopay.all()
			})
		},
		invalidateMaintenance: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.maintenance.all()
			})
		},
		invalidateLeases: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.leases.all() })
		},
		invalidateSettings: () => {
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.settings.all()
			})
		},
		invalidateAll: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.all })
		}
	}
}
