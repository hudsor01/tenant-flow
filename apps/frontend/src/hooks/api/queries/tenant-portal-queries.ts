/**
 * Tenant Portal Query Options
 *
 * TanStack Query options for tenant portal operations.
 * Uses native fetch for NestJS calls.
 */

import { apiRequest } from '#lib/api-request'
import { DEFAULT_RETRY_ATTEMPTS } from '@repo/shared/types/api-contracts'
import type { MaintenanceCategory, MaintenancePriority } from '@repo/shared/types/core'
import { createQueryOptions } from './create-query-options'

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
 * Dashboard data
 */
	dashboard: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'dashboard'],
			queryFn: () => apiRequest('/api/v1/tenant-portal/dashboard'),
			cache: 'DETAIL',
			refetchOnWindowFocus: false,
		}),

	/**
	 * Amount due for current period
 * Critical data - uses interval for real-time updates
 */
	amountDue: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'amount-due'],
			queryFn: () => apiRequest<AmountDueResponse>('/api/v1/tenants/payments/amount-due'),
			cache: 'STATS',
			refetchInterval: 60000, // 1 min - critical payment data
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: false,
		}),

	/**
 * Payment history and upcoming payments
 */
	payments: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'payments'],
			queryFn: () => apiRequest<{
				payments: TenantPayment[]
				methodsEndpoint: string
			}>('/api/v1/tenants/payments'),
			cache: 'LIST',
			// No interval - list data refreshes on navigation
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
 * Autopay/subscription status for active lease
 */
	autopay: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'autopay'],
			queryFn: () => apiRequest<TenantAutopayStatus>('/api/v1/tenants/autopay'),
			cache: 'DETAIL',
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
 * Maintenance request history with summary stats
 */
	maintenance: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'maintenance'],
			queryFn: () => apiRequest<{
				requests: TenantMaintenanceRequest[]
				summary: TenantMaintenanceStats
			}>('/api/v1/tenants/maintenance'),
			cache: 'LIST',
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
 * Active lease with unit/property metadata
 */
	lease: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'lease'],
			queryFn: () => apiRequest<TenantLease | null>('/api/v1/tenants/leases'),
			cache: 'DETAIL',
			refetchOnWindowFocus: false,
			retry: DEFAULT_RETRY_ATTEMPTS
		}),

	/**
 * Lease documents (signed agreement, receipts)
 */
documents: () =>
	createQueryOptions({
		queryKey: [...tenantPortalQueries.all(), 'documents'],
		queryFn: () =>
			apiRequest<{ documents: TenantDocument[] }>(
				'/api/v1/tenants/leases/documents'
			),
		cache: 'DETAIL',
		refetchOnWindowFocus: false,
		retry: DEFAULT_RETRY_ATTEMPTS
	}),

	/**
 * Tenant profile and settings
 */
	settings: () =>
		createQueryOptions({
			queryKey: [...tenantPortalQueries.all(), 'settings'],
			queryFn: () => apiRequest<TenantSettings>('/api/v1/tenants/settings'),
			cache: 'DETAIL',
			refetchOnWindowFocus: false,
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
