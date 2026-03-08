/**
 * Tenant Query Keys & Options
 * Extracted to avoid circular dependencies with mutation hooks
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
import type {
	PaginatedResponse,
	TenantFilters,
	TenantInvitation
} from '#types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	InvitationData,
	PageState
} from '#components/auth/accept-invite/accept-invite-form-types'
import { mapTenantRow } from './tenant-mappers'
import type { TenantPostgrestRow } from './tenant-mappers'

const TENANT_BASE_SELECT =
	'id, user_id, created_at, updated_at, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, ssn_last_four, stripe_customer_id'

const TENANT_WITH_LEASE_SELECT =
	'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, auto_pay_enabled, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'

export class InvalidInviteError extends Error {
	state: PageState
	constructor(state: PageState, message?: string) {
		super(message ?? `Invitation ${state}`)
		this.state = state
	}
}

/**
 * Tenant query factory
 */
export const tenantQueries = {
	all: () => ['tenants'] as const,
	lists: () => [...tenantQueries.all(), 'list'] as const,

	/**
	 * Paginated tenant list with optional filters.
	 * Joins users table to populate name/email/phone on TenantWithLeaseInfo.
	 * Joins lease_tenants → leases for current lease context.
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
							`users.full_name.ilike.%${safe}%,users.email.ilike.%${safe}%`
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
	 * Joins users + lease_tenants → leases → units → properties
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

				return mapTenantRow(
					data as TenantPostgrestRow
				) as TenantWithLeaseInfo
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

				const [totalResult, activeResult, inactiveResult] =
					await Promise.all([
						supabase
							.from('tenants')
							.select('id', { count: 'exact', head: true }),
						supabase
							.from('tenants')
							.select('id', { count: 'exact', head: true })
							.eq('users.status', 'active'),
						supabase
							.from('tenants')
							.select('id', { count: 'exact', head: true })
							.eq('users.status', 'inactive')
					])

				if (totalResult.error)
					handlePostgrestError(totalResult.error, 'tenants')
				if (activeResult.error)
					handlePostgrestError(activeResult.error, 'tenants')
				if (inactiveResult.error)
					handlePostgrestError(inactiveResult.error, 'tenants')

				const total = totalResult.count ?? 0
				const active = activeResult.count ?? 0
				const inactive = inactiveResult.count ?? 0

				return {
					total,
					active,
					inactive,
					newThisMonth: 0,
					totalTenants: total,
					activeTenants: active
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000
		}),

	invitations: () => [...tenantQueries.all(), 'invitations'] as const,

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
			queryKey: [
				...tenantQueries.details(),
				tenant_id,
				'notification-preferences'
			],
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

				if (tenantError)
					handlePostgrestError(tenantError, 'tenants')

				const { data, error } = await supabase
					.from('notification_settings')
					.select('email, sms, maintenance, general')
					.eq('user_id', tenantRow!.user_id)
					.single()

				if (error)
					handlePostgrestError(error, 'notification_settings')

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
		}),

	/**
	 * Tenant invitations list
	 * Uses tenant_invitations table directly via PostgREST
	 */
	invitationList: () =>
		queryOptions({
			queryKey: tenantQueries.invitations(),
			queryFn: async (): Promise<PaginatedResponse<TenantInvitation>> => {
				const supabase = createClient()
				const { data, error, count } = await supabase
					.from('tenant_invitations')
					.select(
						'id, email, lease_id, unit_id, status, created_at, expires_at, accepted_at, leases(id, units(id, unit_number, properties(id, name)))',
						{ count: 'exact' }
					)
					.order('created_at', { ascending: false })

				if (error)
					handlePostgrestError(error, 'tenant_invitations')

				const total = count ?? 0

				type InvitationRow = {
					id: string
					email: string
					lease_id: string | null
					unit_id: string | null
					status: string
					created_at: string | null
					expires_at: string
					accepted_at: string | null
					leases: {
						id: string
						units: {
							id: string
							unit_number: string | null
							properties: {
								id: string
								name: string
							} | null
						} | null
					} | null
				}
				const invitations: TenantInvitation[] = (
					data as unknown as InvitationRow[]
				).map(row => ({
					id: row.id,
					email: row.email,
					first_name: null,
					last_name: null,
					unit_id: row.unit_id ?? row.leases?.units?.id ?? '',
					unit_number: row.leases?.units?.unit_number ?? '',
					property_name:
						row.leases?.units?.properties?.name ?? '',
					created_at: row.created_at ?? '',
					expires_at: row.expires_at,
					accepted_at: row.accepted_at,
					status:
						(row.status as TenantInvitation['status']) ?? 'sent'
				}))

				return {
					data: invitations,
					total,
					pagination: {
						page: 1,
						limit: total,
						total,
						totalPages: 1
					}
				}
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	/**
	 * Validate a tenant invitation code via Edge Function.
	 * Used by the accept-invite page (unauthenticated tenant flow).
	 */
	validateInvitation: (code: string | null) =>
		queryOptions({
			queryKey: [...tenantQueries.invitations(), 'validate', code],
			queryFn: async (): Promise<InvitationData> => {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
				const response = await fetch(
					`${supabaseUrl}/functions/v1/tenant-invitation-validate`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ code })
					}
				)

				if (!response.ok) {
					if (response.status === 404) {
						throw new InvalidInviteError(
							'invalid',
							'This invitation is invalid or has already been used.'
						)
					} else if (response.status === 410) {
						throw new InvalidInviteError('expired')
					}
					throw new InvalidInviteError('error')
				}

				const data = (await response.json()) as InvitationData

				if (!data.valid) {
					throw new InvalidInviteError('invalid')
				}

				return data
			},
			enabled: !!code,
			retry: false
		})
}
