'use client'

/**
 * Tenant Maintenance Hooks
 * Maintenance request queries and create mutation for tenant portal
 *
 * Split from use-tenant-portal.ts for 300-line compliance
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { mutationKeys } from './mutation-keys'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { DEFAULT_RETRY_ATTEMPTS } from '#shared/types/api-contracts'
import type {
	MaintenanceCategory,
	MaintenancePriority
} from '#shared/types/core'
import { tenantPortalKeys } from './use-tenant-portal-keys'

// ============================================================================
// TYPES
// ============================================================================

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

export interface MaintenanceRequestCreate {
	title: string
	description: string
	priority: MaintenancePriority
	category?: MaintenanceCategory
	allowEntry: boolean
	photos?: string[]
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const tenantMaintenanceQueries = {
	maintenance: () =>
		queryOptions({
			queryKey: tenantPortalKeys.maintenance.all(),
			queryFn: async (): Promise<{
				requests: TenantMaintenanceRequest[]
				summary: TenantMaintenanceStats
			}> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user)
					return {
						requests: [],
						summary: { total: 0, open: 0, inProgress: 0, completed: 0 }
					}

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

				// Parallel queries: paginated list + DB-level counts (no JS filtering)
				const [requestsResult, openResult, inProgressResult, completedResult] =
					await Promise.all([
						supabase
							.from('maintenance_requests')
							.select(
								'id, title, description, priority, status, created_at, updated_at, completed_at, unit_id, requested_by',
								{ count: 'exact' }
							)
							.eq('tenant_id', tenantRecord.id)
							.order('created_at', { ascending: false })
							.limit(50),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantRecord.id)
							.in('status', ['open', 'assigned']),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantRecord.id)
							.in('status', ['in_progress', 'needs_reassignment']),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantRecord.id)
							.eq('status', 'completed')
					])

				if (requestsResult.error)
					handlePostgrestError(requestsResult.error, 'maintenance_requests')

				const rows = requestsResult.data ?? []
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

				const total = requestsResult.count ?? 0
				const open = openResult.count ?? 0
				const inProgress = inProgressResult.count ?? 0
				const completed = completedResult.count ?? 0

				return { requests, summary: { total, open, inProgress, completed } }
			},
			...QUERY_CACHE_TIMES.LIST,
			retry: DEFAULT_RETRY_ATTEMPTS
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useTenantMaintenance() {
	return useQuery(tenantMaintenanceQueries.maintenance())
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenantPortal.createMaintenanceRequest,
		mutationFn: async (request: MaintenanceRequestCreate) => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { data: tenantRecord, error: tenantError } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()

			if (tenantError || !tenantRecord)
				throw new Error('Tenant record not found')

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
			queryClient.invalidateQueries({
				queryKey: tenantPortalKeys.maintenance.list()
			})
		},
		onError: (error) => {
			handleMutationError(error, 'Create maintenance request')
		}
	})
}
