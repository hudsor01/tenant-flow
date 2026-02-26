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
 * - rent_payments table: tenant_id FK for payment history
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { sanitizeSearchInput } from '#lib/sanitize-search'
import type {
	Tenant,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import type { TenantStats } from '@repo/shared/types/stats'
import type {
	PaginatedResponse,
	TenantFilters,
	TenantInvitation,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

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
					.select(
						'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, auto_pay_enabled, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))',
						{ count: 'exact' }
					)
					.order('created_at', { ascending: false })

				if (filters?.search) {
					// Search on users table full_name/email — filter via ilike on joined columns
					// PostgREST supports filtering on embedded resources with dot notation
					const safe = sanitizeSearchInput(filters.search)
					if (safe) {
						q = q.or(
							`users.full_name.ilike.%${safe}%,users.email.ilike.%${safe}%`
						)
					}
				}

				// property_id filter: must join via lease_tenants → leases → units
				// This is complex to filter at PostgREST level without RPC — skip for now
				// TODO(phase-53): add property_id filter via RPC when wired

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'tenants')

				const total = count ?? 0

				// Map raw PostgREST rows to TenantWithLeaseInfo shape
				const tenants: TenantWithLeaseInfo[] = (data ?? []).map(
					(row: {
						id: string
						user_id: string
						created_at: string | null
						updated_at: string | null
						date_of_birth: string | null
						emergency_contact_name: string | null
						emergency_contact_phone: string | null
						emergency_contact_relationship: string | null
						identity_verified: boolean | null
						ssn_last_four: string | null
						stripe_customer_id: string | null
						users: {
							id: string
							email: string
							first_name: string | null
							last_name: string | null
							full_name: string
							phone: string | null
							status: string
						} | null
						lease_tenants: Array<{
							lease_id: string
							is_primary: boolean | null
							leases: {
								id: string
								lease_status: string
								start_date: string
								end_date: string
								rent_amount: number
								security_deposit: number
								unit_id: string
								auto_pay_enabled: boolean | null
								primary_tenant_id: string
								owner_user_id: string
								units: {
									id: string
									unit_number: string | null
									bedrooms: number | null
									bathrooms: number | null
									square_feet: number | null
									rent_amount: number
									property_id: string
									properties: {
										id: string
										name: string
										address_line1: string
										address_line2: string | null
										city: string
										state: string
										postal_code: string
									} | null
								} | null
							} | null
						}>
					}) => mapTenantRow(row)
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
					.select(
						'id, user_id, created_at, updated_at, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, ssn_last_four, stripe_customer_id'
					)
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
					.select(
						'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, auto_pay_enabled, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'
					)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'tenants')

				return mapTenantRow(
					data as Parameters<typeof mapTenantRow>[0]
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

				const [totalResult, activeResult, inactiveResult] = await Promise.all([
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

				if (totalResult.error) handlePostgrestError(totalResult.error, 'tenants')
				if (activeResult.error) handlePostgrestError(activeResult.error, 'tenants')
				if (inactiveResult.error) handlePostgrestError(inactiveResult.error, 'tenants')

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
					.select(
						'*, users!tenants_user_id_fkey(id, email, first_name, last_name, full_name, phone, status), lease_tenants(lease_id, is_primary, leases(id, lease_status, start_date, end_date, rent_amount, security_deposit, unit_id, auto_pay_enabled, primary_tenant_id, owner_user_id, units(id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, property_id, properties(id, name, address_line1, address_line2, city, state, postal_code))))'
					)
					.order('created_at', { ascending: true })

				if (error) handlePostgrestError(error, 'tenants')

				return (data ?? []).map(
					(row: Parameters<typeof mapTenantRow>[0]) => mapTenantRow(row)
				) as TenantWithLeaseInfo[]
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
			structuralSharing: true
		}),

	/**
	 * Tenant detail query with SSE real-time updates
	 * SSE automatically invalidates queries on tenant.updated events
	 * Fallback polling at 5 min for missed events, refetch on window focus
	 */
	polling: (id: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), id, 'polling'],
			queryFn: async (): Promise<Tenant> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('tenants')
					.select(
						'id, user_id, created_at, updated_at, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, ssn_last_four, stripe_customer_id'
					)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'tenants')

				return data as Tenant
			},
			enabled: !!id,
			// SSE provides real-time updates; 5-min fallback for missed events
			refetchInterval: 5 * 60 * 1000, // 5 minutes (reduced from 30 seconds)
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
			staleTime: 30_000 // Consider fresh for 30 seconds
		}),

	/**
	 * Notification preferences for a tenant
	 * Read from notification_settings table (keyed by user_id)
	 * Must join tenants → users to get user_id, then query notification_settings
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

				// First get the user_id for this tenant
				const { data: tenantRow, error: tenantError } = await supabase
					.from('tenants')
					.select('user_id')
					.eq('id', tenant_id)
					.single()

				if (tenantError) handlePostgrestError(tenantError, 'tenants')

				// Then get notification settings for that user
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

				if (error) handlePostgrestError(error, 'tenant_invitations')

				const total = count ?? 0

				// Cast required: Supabase infers embedded FK relations as arrays; we cast to known shape
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
							properties: { id: string; name: string } | null
						} | null
					} | null
				}
				const invitations: TenantInvitation[] = (data as unknown as InvitationRow[]).map(
					row => ({
						id: row.id,
						email: row.email,
						first_name: null,
						last_name: null,
						unit_id: row.unit_id ?? row.leases?.units?.id ?? '',
						unit_number: row.leases?.units?.unit_number ?? '',
						property_name: row.leases?.units?.properties?.name ?? '',
						created_at: row.created_at ?? '',
						expires_at: row.expires_at,
						accepted_at: row.accepted_at,
						status: (row.status as TenantInvitation['status']) ?? 'sent'
					})
				)

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
	 * Payment history for a specific tenant
	 * Queries rent_payments table where tenant_id = tenantId
	 */
	paymentHistory: (tenantId: string, limit?: number) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenantId, 'payments', limit ?? 20],
			queryFn: async (): Promise<TenantPaymentHistoryResponse> => {
				const supabase = createClient()
				const pageLimit = limit ?? 20

				const { data, error, count } = await supabase
					.from('rent_payments')
					.select(
						'id, amount, status, paid_date, due_date, created_at, lease_id, tenant_id, payment_method_type, period_start, period_end',
						{ count: 'exact' }
					)
					.eq('tenant_id', tenantId)
					.order('created_at', { ascending: false })
					.limit(pageLimit)

				if (error) handlePostgrestError(error, 'rent_payments')

				return {
					payments: data ?? [],
					pagination: {
						page: 1,
						limit: pageLimit,
						total: count ?? 0
					}
				}
			},
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 5 * 60 * 1000
		}),

	/**
	 * All leases (past and current) for a specific tenant
	 * Queries via lease_tenants junction for lease history
	 */
	leaseHistory: (tenantId: string) =>
		queryOptions({
			queryKey: [...tenantQueries.details(), tenantId, 'leases'],
			queryFn: async (): Promise<{
				leases: Array<{
					id: string
					property_name: string
					unit_number: string
					start_date: string
					end_date: string | null
					rent_amount: number
					status: string
				}>
			}> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('lease_tenants')
					.select(
						'leases(id, lease_status, start_date, end_date, rent_amount, units(unit_number, properties(name)))'
					)
					.eq('tenant_id', tenantId)
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'lease_tenants')

				// Cast required: Supabase infers embedded FK relations as arrays; we cast to known shape
				type LeaseHistoryRow = {
					leases: {
						id: string
						lease_status: string
						start_date: string
						end_date: string | null
						rent_amount: number
						units: {
							unit_number: string | null
							properties: { name: string } | null
						} | null
					} | null
				}

				const leases = (data as unknown as LeaseHistoryRow[])
					.filter(row => row.leases !== null)
					.map(row => ({
						id: row.leases!.id,
						property_name: row.leases!.units?.properties?.name ?? '',
						unit_number: row.leases!.units?.unit_number ?? '',
						start_date: row.leases!.start_date,
						end_date: row.leases!.end_date,
						rent_amount: row.leases!.rent_amount,
						status: row.leases!.lease_status
					}))

				return { leases }
			},
			enabled: !!tenantId,
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 10 * 60 * 1000
		})
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Maps a raw PostgREST tenant row (with user and lease_tenants joins)
 * to the TenantWithLeaseInfo shape expected by the frontend.
 */
function mapTenantRow(row: {
	id: string
	user_id: string
	created_at: string | null
	updated_at: string | null
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	ssn_last_four: string | null
	stripe_customer_id: string | null
	users?: {
		id: string
		email: string
		first_name: string | null
		last_name: string | null
		full_name: string
		phone: string | null
		status: string
	} | null
	lease_tenants?: Array<{
		lease_id: string
		is_primary: boolean | null
		leases: {
			id: string
			lease_status: string
			start_date: string
			end_date: string
			rent_amount: number
			security_deposit: number
			unit_id: string
			auto_pay_enabled: boolean | null
			primary_tenant_id: string
			owner_user_id: string
			units: {
				id: string
				unit_number: string | null
				bedrooms: number | null
				bathrooms: number | null
				square_feet: number | null
				rent_amount: number
				property_id: string
				properties: {
					id: string
					name: string
					address_line1: string
					address_line2: string | null
					city: string
					state: string
					postal_code: string
				} | null
			} | null
		} | null
	}>
}): TenantWithLeaseInfo {
	const user = row.users ?? null
	const leaseRows = row.lease_tenants ?? []

	// Find the primary/active lease (prefer active, fallback to first)
	const primaryLeaseTenant = leaseRows.find(lt => lt.is_primary) ?? leaseRows[0]
	const activeLease = primaryLeaseTenant?.leases ?? null
	const activeUnit = activeLease?.units ?? null
	const activeProperty = activeUnit?.properties ?? null

	// Build base fields (required fields only, no optional undefined assignments)
	const base = {
		id: row.id,
		user_id: row.user_id,
		created_at: row.created_at,
		updated_at: row.updated_at,
		date_of_birth: row.date_of_birth,
		emergency_contact_name: row.emergency_contact_name,
		emergency_contact_phone: row.emergency_contact_phone,
		emergency_contact_relationship: row.emergency_contact_relationship,
		identity_verified: row.identity_verified,
		ssn_last_four: row.ssn_last_four,
		stripe_customer_id: row.stripe_customer_id,
		// phone/first_name/last_name accept null (not undefined)
		phone: user?.phone ?? null,
		first_name: user?.first_name ?? null,
		last_name: user?.last_name ?? null,
		// Current/primary lease
		currentLease: activeLease
			? {
					id: activeLease.id,
					start_date: activeLease.start_date,
					end_date: activeLease.end_date,
					rent_amount: activeLease.rent_amount,
					security_deposit: activeLease.security_deposit,
					status: activeLease.lease_status,
					primary_tenant_id: activeLease.primary_tenant_id,
					unit_id: activeLease.unit_id,
					auto_pay_enabled: activeLease.auto_pay_enabled ?? false
				}
			: null,
		// All leases (history)
		leases: leaseRows
			.filter(lt => lt.leases !== null)
			.map(lt => {
				const leaseProperty = lt.leases!.units?.properties
				return {
					id: lt.leases!.id,
					start_date: lt.leases!.start_date,
					end_date: lt.leases!.end_date as string | null,
					rent_amount: lt.leases!.rent_amount,
					status: lt.leases!.lease_status,
					...(leaseProperty
						? { property: { address_line1: leaseProperty.address_line1 } }
						: {})
				}
			}),
		// Unit info
		unit: activeUnit
			? {
					id: activeUnit.id,
					unit_number: activeUnit.unit_number,
					bedrooms: activeUnit.bedrooms,
					bathrooms: activeUnit.bathrooms,
					square_feet: activeUnit.square_feet,
					rent_amount: activeUnit.rent_amount
				}
			: null,
		// Property info
		property: activeProperty
			? {
					id: activeProperty.id,
					name: activeProperty.name,
					address_line1: activeProperty.address_line1,
					address_line2: activeProperty.address_line2 ?? null,
					city: activeProperty.city,
					state: activeProperty.state,
					postal_code: activeProperty.postal_code
				}
			: null
	}

	// Conditionally add optional string fields to avoid exactOptionalPropertyTypes violations
	return {
		...base,
		...(user?.full_name ? { name: user.full_name } : {}),
		...(user?.email ? { email: user.email } : {}),
		...(activeLease ? { monthlyRent: activeLease.rent_amount } : {}),
		...(activeLease ? { lease_status: activeLease.lease_status } : {}),
		...(activeUnit?.unit_number ? { unitDisplay: activeUnit.unit_number } : {}),
		...(activeProperty ? { propertyDisplay: activeProperty.name } : {})
	} as TenantWithLeaseInfo
}
