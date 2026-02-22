/**
 * Lease Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { Lease } from '@repo/shared/types/core'
import type { LeaseStatsResponse } from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Lease query filters
 */
export interface LeaseFilters {
	property_id?: string
	unit_id?: string
	tenant_id?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

/**
 * Signature status for a lease
 * Derived from DB columns: owner_signed_at, tenant_signed_at, sent_for_signature_at
 */
export interface SignatureStatus {
	lease_id: string
	status: string
	owner_signed: boolean
	owner_signed_at: string | null
	tenant_signed: boolean
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	both_signed: boolean
}

/**
 * Tenant Portal Lease type
 * Uses singular relation names to match page component expectations.
 */
export type TenantPortalLease = Lease & {
	unit: {
		id: string
		unit_number: string
		bedrooms: number | null
		bathrooms: number | null
		square_feet: number | null
		property?: {
			id: string
			name: string
			address?: string | null
			city?: string | null
			state?: string | null
		}
	} | null
	tenant: {
		id: string
		user_id: string | null
	} | null
	metadata: {
		documentUrl: string | null
	}
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Lease query factory
 */
export const leaseQueries = {
	all: () => ['leases'] as const,
	lists: () => [...leaseQueries.all(), 'list'] as const,

	list: (filters?: LeaseFilters) =>
		queryOptions({
			queryKey: [...leaseQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<Lease>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('leases')
					.select(
						'*, tenants:primary_tenant_id(id, user_id), units(id, unit_number, bedrooms, bathrooms, square_feet)',
						{ count: 'exact' }
					)
					.order('created_at', { ascending: false })

				// Filter inactive by default unless a specific status is requested
				if (filters?.status) {
					q = q.eq('lease_status', filters.status)
				} else {
					q = q.neq('lease_status', 'inactive')
				}

				if (filters?.unit_id) {
					q = q.eq('unit_id', filters.unit_id)
				}

				if (filters?.tenant_id) {
					q = q.eq('primary_tenant_id', filters.tenant_id)
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'leases')

				return {
					data: (data as unknown as Lease[]) ?? [],
					total: count ?? 0,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total: count ?? 0,
						totalPages: Math.ceil((count ?? 0) / limit)
					}
				}
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	details: () => [...leaseQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.details(), id],
			queryFn: async (): Promise<Lease> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('*, tenants:primary_tenant_id(*), units(*, properties(*))')
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'leases')

				return data as unknown as Lease
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	tenantPortalActive: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'tenant-portal', 'active'],
			queryFn: async (): Promise<TenantPortalLease | null> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('*, units(id, unit_number, bedrooms, bathrooms, square_feet), tenants:primary_tenant_id(id, user_id)')
					.eq('lease_status', 'active')
					.maybeSingle()

				if (error) handlePostgrestError(error, 'leases')

				if (!data) return null

				// Map PostgREST join shape (units/tenants plural) to expected singular shape
				const row = data as unknown as Lease & {
					units: TenantPortalLease['unit']
					tenants: TenantPortalLease['tenant']
				}

				return {
					...row,
					unit: row.units,
					tenant: row.tenants,
					metadata: { documentUrl: null }
				} as TenantPortalLease
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	expiring: (days: number = 30) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'expiring', days],
			queryFn: async (): Promise<Lease[]> => {
				const supabase = createClient()
				const now = new Date()
				const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

				const { data, error } = await supabase
					.from('leases')
					.select('*')
					.eq('lease_status', 'active')
					.lte('end_date', future.toISOString())
					.gte('end_date', now.toISOString())
					.order('end_date', { ascending: true })

				if (error) handlePostgrestError(error, 'leases')

				return (data as unknown as Lease[]) ?? []
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	stats: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'stats'],
			queryFn: async (): Promise<LeaseStatsResponse> => {
				const supabase = createClient()

				const [totalResult, activeResult, expiredResult, terminatedResult, rentResult, expiringResult] =
					await Promise.all([
						supabase
							.from('leases')
							.select('id', { count: 'exact', head: true })
							.neq('lease_status', 'inactive'),
						supabase
							.from('leases')
							.select('id', { count: 'exact', head: true })
							.eq('lease_status', 'active'),
						supabase
							.from('leases')
							.select('id', { count: 'exact', head: true })
							.eq('lease_status', 'ended'),
						supabase
							.from('leases')
							.select('id', { count: 'exact', head: true })
							.eq('lease_status', 'terminated'),
						supabase
							.from('leases')
							.select('rent_amount, security_deposit')
							.eq('lease_status', 'active'),
						supabase
							.from('leases')
							.select('id', { count: 'exact', head: true })
							.eq('lease_status', 'active')
							.lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
							.gte('end_date', new Date().toISOString())
					])

				if (totalResult.error) handlePostgrestError(totalResult.error, 'leases')
				if (activeResult.error) handlePostgrestError(activeResult.error, 'leases')
				if (expiredResult.error) handlePostgrestError(expiredResult.error, 'leases')
				if (terminatedResult.error) handlePostgrestError(terminatedResult.error, 'leases')
				if (rentResult.error) handlePostgrestError(rentResult.error, 'leases')
				if (expiringResult.error) handlePostgrestError(expiringResult.error, 'leases')

				const activeLeases = rentResult.data as Array<{ rent_amount: number; security_deposit: number }> ?? []
				const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + (l.rent_amount ?? 0), 0)
				const totalSecurityDeposits = activeLeases.reduce((sum, l) => sum + (l.security_deposit ?? 0), 0)
				const averageRent = activeLeases.length > 0 ? totalMonthlyRent / activeLeases.length : 0

				return {
					totalLeases: totalResult.count ?? 0,
					activeLeases: activeResult.count ?? 0,
					expiredLeases: expiredResult.count ?? 0,
					terminatedLeases: terminatedResult.count ?? 0,
					totalMonthlyRent,
					averageRent,
					total_security_deposits: totalSecurityDeposits,
					expiringLeases: expiringResult.count ?? 0
				}
			},
			...QUERY_CACHE_TIMES.STATS
		}),

	signatureStatus: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'signature-status', id],
			queryFn: async (): Promise<SignatureStatus> => {
				const supabase = createClient()
				// Signature status is stored in DB columns (added in Phase 44 DocuSeal integration)
				const { data, error } = await supabase
					.from('leases')
					.select('id, lease_status, owner_signed_at, tenant_signed_at, sent_for_signature_at')
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'leases')

				const row = data as {
					id: string
					lease_status: string
					owner_signed_at: string | null
					tenant_signed_at: string | null
					sent_for_signature_at: string | null
				}

				const owner_signed = row.owner_signed_at !== null
				const tenant_signed = row.tenant_signed_at !== null

				return {
					lease_id: row.id,
					status: row.lease_status,
					owner_signed,
					owner_signed_at: row.owner_signed_at,
					tenant_signed,
					tenant_signed_at: row.tenant_signed_at,
					sent_for_signature_at: row.sent_for_signature_at,
					both_signed: owner_signed && tenant_signed
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	analytics: {
		performance: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'performance'],
				queryFn: async (): Promise<Record<string, unknown>> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_property_performance_analytics',
						{ p_user_id: user.id }
					)
					if (error) handlePostgrestError(error, 'leases')
					return (data ?? {}) as Record<string, unknown>
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		duration: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'duration'],
				queryFn: async (): Promise<Record<string, unknown>> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_revenue_trends_optimized',
						{ p_user_id: user.id, p_months: 12 }
					)
					if (error) handlePostgrestError(error, 'leases')
					return (data ?? {}) as Record<string, unknown>
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		turnover: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'turnover'],
				queryFn: async (): Promise<Record<string, unknown>> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_revenue_trends_optimized',
						{ p_user_id: user.id, p_months: 12 }
					)
					if (error) handlePostgrestError(error, 'leases')
					return (data ?? {}) as Record<string, unknown>
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		revenue: () =>
			queryOptions({
				queryKey: [...leaseQueries.all(), 'analytics', 'revenue'],
				queryFn: async (): Promise<Record<string, unknown>> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_revenue_trends_optimized',
						{ p_user_id: user.id, p_months: 12 }
					)
					if (error) handlePostgrestError(error, 'leases')
					return (data ?? {}) as Record<string, unknown>
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			})
	}
}
