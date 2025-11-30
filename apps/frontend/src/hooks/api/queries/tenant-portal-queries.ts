/**
 * Tenant Portal Query Options
 *
 * TanStack Query options for tenant portal operations
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { DEFAULT_RETRY_ATTEMPTS } from '@repo/shared/types/api-contracts'
import type { MaintenanceCategory, Priority } from '@repo/shared/types/core'

/**
 * Tenant portal types
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
	priority: Priority
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
	first_name: string
	last_name: string
	email: string
	phone: string | null
	status: string
}

export interface TenantSettings {
	profile: TenantProfile
	preferences: {
		notifications: boolean
		emailReminders: boolean
	}
}

export interface CreateMaintenanceRequestInput {
	title: string
	description: string
	priority: Priority
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

/**
 * Tenant portal query factory
 */
export const tenantPortalQueries = {
	/**
	 * Base key for all tenant portal queries
	 */
	all: () => ['tenant-portal'] as const,

	/**
	 * Dashboard data
	 */
	dashboard: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'dashboard'],
			queryFn: () => clientFetch('/api/v1/tenant-portal/dashboard'),
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Amount due for current period
	 */
	amountDue: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'amount-due'],
			queryFn: () => clientFetch<AmountDueResponse>('/api/v1/tenant-portal/amount-due'),
			...QUERY_CACHE_TIMES.STATS,
			refetchInterval: 60000, // Refetch every minute to stay current
		}),

	/**
	 * Payment history and upcoming payments
	 */
	payments: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'payments'],
			queryFn: () => clientFetch<{
				payments: TenantPayment[]
				methodsEndpoint: string
			}>('/api/v1/tenant-portal/payments'),
			...QUERY_CACHE_TIMES.LIST,
			refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Autopay/subscription status for active lease
	 */
	autopay: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'autopay'],
			queryFn: () => clientFetch<TenantAutopayStatus>('/api/v1/tenant-portal/autopay'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchInterval: 5 * 60 * 1000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Maintenance request history with summary stats
	 */
	maintenance: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'maintenance'],
			queryFn: () => clientFetch<{
				requests: TenantMaintenanceRequest[]
				summary: TenantMaintenanceStats
			}>('/api/v1/tenant-portal/maintenance'),
			...QUERY_CACHE_TIMES.LIST,
			refetchInterval: 5 * 60 * 1000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Active lease with unit/property metadata
	 */
	lease: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'lease'],
			queryFn: () => clientFetch<TenantLease | null>('/api/v1/tenant-portal/leases'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Lease documents (signed agreement, receipts)
	 */
	documents: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'documents'],
			queryFn: () => clientFetch<{ documents: TenantDocument[] }>('/api/v1/tenant-portal/documents'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchInterval: 10 * 60 * 1000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
	 * Tenant profile and settings
	 */
	settings: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'settings'],
			queryFn: () => clientFetch<TenantSettings>('/api/v1/tenant-portal/settings'),
			...QUERY_CACHE_TIMES.DETAIL,
			refetchInterval: 10 * 60 * 1000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),
}

/**
 * Tenant portal query keys for cache management
 */
export const tenantPortalKeys = {
	all: tenantPortalQueries.all(),
	dashboard: () => [...tenantPortalQueries.all(), 'dashboard'],
	amountDue: () => [...tenantPortalQueries.all(), 'amount-due'],
	payments: {
		all: () => [...tenantPortalQueries.all(), 'payments']
	},
	autopay: {
		all: () => [...tenantPortalQueries.all(), 'autopay'],
		status: () => [...tenantPortalQueries.all(), 'autopay']
	},
	maintenance: {
		all: () => [...tenantPortalQueries.all(), 'maintenance'],
		list: () => [...tenantPortalQueries.all(), 'maintenance']
	},
	leases: {
		all: () => [...tenantPortalQueries.all(), 'lease']
	},
	documents: {
		all: () => [...tenantPortalQueries.all(), 'documents']
	},
	settings: {
		all: () => [...tenantPortalQueries.all(), 'settings']
	}
}
