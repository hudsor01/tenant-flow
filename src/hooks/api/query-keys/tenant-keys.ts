/**
 * Tenant Query Keys & Options
 * Extracted to avoid circular dependencies with mutation hooks
 *
 * Invitation queries split to tenant-invitation-keys.ts.
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 *
 * Schema notes:
 * - tenants table: id, user_id, emergency_contact_*, identity_verified, ssn_last_four, stripe_customer_id
 * - Tenant name/email/phone live on users table (joined via user_id)
 * - tenant_invitations table exists for invitation management
 * - notification_settings table stores notification prefs (keyed by user_id)
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { sanitizeSearchInput } from '#lib/sanitize-search'
import type { Tenant, TenantWithLeaseInfo } from '#types/core'
import type { TenantStats } from '#types/stats'
import type { PaginatedResponse, TenantFilters } from '#types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mapTenantRow } from './tenant-mappers'
import type { TenantPostgrestRow } from './tenant-mappers'

const TENANT_BASE_SELECT =
	'id, user_id, owner_user_id, first_name, last_name, name, email, phone, status, created_at, updated_at, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, ssn_last_four'

const TENANT_WITH_LEASE_SELECT =
	'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'

/**
 * Tenant query factory
 */
export const tenantQueries = {
	all: () => ['tenants'] as const,
	lists: () => [...tenantQueries.all(), 'list'] as const,

	/**
	 * Paginated tenant list with optional filters.
	 * Joins users table to populate name/email/phone on TenantWithLeaseInfo.
	 * Joins lease_tenants -> leases for current lease context.
	 */
	list: (filters?: TenantFilters) =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<TenantWithLeaseInfo>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('tenants')
					.select(TENANT_WITH_LEASE_SELECT, { count: 'exact' })
					.order('created_at', { ascending: false })

				if (filters?.search) {
					const safe = sanitizeSearchInput(filters.search)
					if (safe) {
						q = q.or(
							`name.ilike.%${safe}%,email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`
						)
					}
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'tenants')

				const total = count ?? 0
				const tenants: TenantWithLeaseInfo[] = (data ?? []).map(
					(row: TenantPostgrestRow) => mapTenantRow(row)
				)

				return {
					data: tenants,
					total,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total,
						totalPages: Math.ceil(total / limit)
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	details: () => [...tenantQueries.all(), 'detail'] as const,

	/**
	 * Single tenant by ID (base fields only, no lease join)
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id],
			queryFn: async (): Promise<Tenant> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('tenants')
					.select(TENANT_BASE_SELECT)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'tenants')

				return data as Tenant
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * Single tenant with embedded lease information
	 * Joins users + lease_tenants -> leases -> units -> properties
	 */
	withLease: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'with-lease', id],
			queryFn: async (): Promise<TenantWithLeaseInfo> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('tenants')
					.select(TENANT_WITH_LEASE_SELECT)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'tenants')

				return mapTenantRow(data as TenantPostgrestRow) as TenantWithLeaseInfo
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * Tenant statistics
	 * Aggregates tenant counts by user status via PostgREST
	 */
	stats: () =>
		queryOptions({
			queryKey: [...tenantQueries.all(), 'stats'],
			queryFn: async (): Promise<TenantStats> => {
				const supabase = createClient()
				const [totalResult, activeResult, inactiveResult] = await Promise.all([
					supabase.from('tenants').select('id', { count: 'exact', head: true }),
					supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('users.status', 'active'),
					supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('users.status', 'inactive')
				])

				if (totalResult.error) handlePostgrestError(totalResult.error, 'tenants')
				if (activeResult.error) handlePostgrestError(activeResult.error, 'tenants')
				if (inactiveResult.error) handlePostgrestError(inactiveResult.error, 'tenants')

				const total = totalResult.count ?? 0
				const active = activeResult.count ?? 0
				const inactive = inactiveResult.count ?? 0

				return { total, active, inactive, newThisMonth: 0, totalTenants: total, activeTenants: active }
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000
		}),

	/**
	 * All tenants (for dropdowns, selects, etc.)
	 * Joins users for name/email display
	 */
	allTenants: () =>
		queryOptions({
			queryKey: [...tenantQueries.lists(), 'all'],
			queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('tenants')
					.select(TENANT_WITH_LEASE_SELECT)
					.order('created_at', { ascending: true })

				if (error) handlePostgrestError(error, 'tenants')

				return (data ?? []).map((row: TenantPostgrestRow) =>
					mapTenantRow(row)
				) as TenantWithLeaseInfo[]
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
			structuralSharing: true
		}),

	/**
	 * Notification preferences for a tenant
	 * Read from notification_settings table (keyed by user_id)
	 */
	notificationPreferences: (tenant_id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenant_id, 'notification-preferences'],
			queryFn: async (): Promise<{
				emailNotifications: boolean
				smsNotifications: boolean
				maintenanceUpdates: boolean
				paymentReminders: boolean
			}> => {
				const supabase = createClient()

				const { data: tenantRow, error: tenantError } = await supabase
					.from('tenants')
					.select('user_id')
					.eq('id', tenant_id)
					.single()

				if (tenantError) handlePostgrestError(tenantError, 'tenants')

				const { data, error } = await supabase
					.from('notification_settings')
					.select('email, sms, maintenance, general')
					.eq('user_id', tenantRow!.user_id)
					.single()

				if (error) handlePostgrestError(error, 'notification_settings')

				return {
					emailNotifications: data?.email ?? true,
					smsNotifications: data?.sms ?? false,
					maintenanceUpdates: data?.maintenance ?? true,
					paymentReminders: data?.general ?? true
				}
			},
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		})
}
