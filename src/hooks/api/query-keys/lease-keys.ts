/**
 * Lease Query Keys & Options
 * TanStack Query v5 queryOptions() factories for lease domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { Lease, LeaseStatsResponse } from '#types/core'
import type { PaginatedResponse } from '#types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { revenueTrendsQuery } from './analytics-keys'

export interface LeaseFilters {
	property_id?: string
	unit_id?: string
	tenant_id?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

/** Signature status derived from DB columns: owner_signed_at, tenant_signed_at, sent_for_signature_at */
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

/** Subset of Lease columns for list/summary views (expiring leases, etc.) */
export type LeaseListItem = Pick<Lease, 'id' | 'unit_id' | 'primary_tenant_id' | 'owner_user_id' | 'rent_amount' | 'lease_status' | 'start_date' | 'end_date' | 'created_at' | 'updated_at'>

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
					.select('*, tenants:primary_tenant_id(id, user_id), units(id, unit_number, bedrooms, bathrooms, square_feet)', { count: 'exact' })
					.order('created_at', { ascending: false })
				if (filters?.status) { q = q.eq('lease_status', filters.status) } else { q = q.neq('lease_status', 'inactive') }
				if (filters?.unit_id) q = q.eq('unit_id', filters.unit_id)
				if (filters?.tenant_id) q = q.eq('primary_tenant_id', filters.tenant_id)
				q = q.range(offset, offset + limit - 1)
				const { data, error, count } = await q
				if (error) handlePostgrestError(error, 'leases')
				const total = count ?? 0
				return {
					data: (data as Lease[]) ?? [],
					total,
					pagination: { page: Math.floor(offset / limit) + 1, limit, total, totalPages: Math.ceil(total / limit) }
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
					.select('*, tenants:primary_tenant_id(id, user_id, full_name, email, phone), units(id, unit_number, bedrooms, bathrooms, square_feet, property_id, properties(id, name, address_line1, city, state, postal_code))')
					.eq('id', id)
					.single()
				if (error) handlePostgrestError(error, 'leases')
				return data as Lease
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	expiring: (days: number = 30) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'expiring', days],
			queryFn: async (): Promise<LeaseListItem[]> => {
				const supabase = createClient()
				const now = new Date()
				const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
				const { data, error } = await supabase
					.from('leases')
					.select('id, unit_id, primary_tenant_id, owner_user_id, rent_amount, lease_status, start_date, end_date, created_at, updated_at')
					.eq('lease_status', 'active')
					.lte('end_date', future.toISOString())
					.gte('end_date', now.toISOString())
					.order('end_date', { ascending: true })
					.limit(50)
				if (error) handlePostgrestError(error, 'leases')
				return data ?? []
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	stats: () =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'stats'],
			queryFn: async (): Promise<LeaseStatsResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc('get_lease_stats', { p_user_id: user.id })
				if (error) handlePostgrestError(error, 'leases')
				const stats = data as Record<string, number>
				return {
					totalLeases: stats.totalLeases ?? 0, activeLeases: stats.activeLeases ?? 0,
					expiredLeases: stats.expiredLeases ?? 0, terminatedLeases: stats.terminatedLeases ?? 0,
					totalMonthlyRent: stats.totalMonthlyRent ?? 0, averageRent: stats.averageRent ?? 0,
					total_security_deposits: stats.total_security_deposits ?? 0, expiringLeases: stats.expiringLeases ?? 0
				}
			},
			...QUERY_CACHE_TIMES.STATS
		}),

	signedDocument: (leaseId: string, enabled = true) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), leaseId, 'signed-document'],
			queryFn: async (): Promise<{ document_url: string | null }> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('docuseal_submission_id, owner_signed_at, tenant_signed_at')
					.eq('id', leaseId)
					.single()
				if (error) handlePostgrestError(error, 'leases')
				const row = data as {
					docuseal_submission_id: string | null
					owner_signed_at: string | null
					tenant_signed_at: string | null
				}
				// Document URL available only when submission exists and both parties have signed.
				// Full URL returned by docuseal-webhook plan when it wires up the signed doc URL.
				return {
					document_url:
						row?.docuseal_submission_id && row.owner_signed_at && row.tenant_signed_at
							? `pending:${row.docuseal_submission_id}`
							: null,
				}
			},
			enabled: enabled && !!leaseId,
			staleTime: 5 * 60 * 1000
		}),

	signatureStatus: (id: string) =>
		queryOptions({
			queryKey: [...leaseQueries.all(), 'signature-status', id],
			queryFn: async (): Promise<SignatureStatus> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('leases')
					.select('id, lease_status, owner_signed_at, tenant_signed_at, sent_for_signature_at')
					.eq('id', id)
					.single()
				if (error) handlePostgrestError(error, 'leases')
				const row = data as { id: string; lease_status: string; owner_signed_at: string | null; tenant_signed_at: string | null; sent_for_signature_at: string | null }
				const owner_signed = row.owner_signed_at !== null
				const tenant_signed = row.tenant_signed_at !== null
				return {
					lease_id: row.id, status: row.lease_status,
					owner_signed, owner_signed_at: row.owner_signed_at,
					tenant_signed, tenant_signed_at: row.tenant_signed_at,
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
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc('get_property_performance_analytics', { p_user_id: user.id })
					if (error) handlePostgrestError(error, 'leases')
					return (data ?? {}) as Record<string, unknown>
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		duration: () => revenueTrendsQuery({ months: 12 }),
		turnover: () => revenueTrendsQuery({ months: 12 }),
		revenue: () => revenueTrendsQuery({ months: 12 })
	}
}
