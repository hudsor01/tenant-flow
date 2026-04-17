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
	useQueryClient,
	mutationOptions
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
import { DEFAULT_RETRY_ATTEMPTS } from '#types/api-contracts'
import type {
	MaintenanceCategory,
	MaintenancePriority
} from '#types/core'
import { tenantPortalKeys, resolveTenantId } from './use-tenant-portal-keys'
import { createLogger } from '#lib/frontend-logger'

const logger = createLogger({ component: 'use-tenant-maintenance' })

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
	stagedFiles?: File[]
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

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId)
					return {
						requests: [],
						summary: { total: 0, open: 0, inProgress: 0, completed: 0 }
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
							.eq('tenant_id', tenantId)
							.order('created_at', { ascending: false })
							.limit(50),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantId)
							.in('status', ['open', 'assigned']),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantId)
							.in('status', ['in_progress', 'needs_reassignment']),
						supabase
							.from('maintenance_requests')
							.select('id', { count: 'exact', head: true })
							.eq('tenant_id', tenantId)
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
// MUTATION OPTIONS FACTORY
// ============================================================================

const tenantMaintenanceMutationFactories = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenantPortal.createMaintenanceRequest,
			mutationFn: async (request: MaintenanceRequestCreate) => {
				const supabase = createClient()

				// Use shared tenant ID resolution
				const tenantId = await resolveTenantId()
				if (!tenantId) throw new Error('Tenant record not found')

				const { data: lease, error: leaseError } = await supabase
					.from('leases')
					.select(
						'id, unit_id, owner_user_id, lease_tenants!inner(tenant_id)'
					)
					.eq('lease_tenants.tenant_id', tenantId)
					.eq('lease_status', 'active')
					.single()

				if (leaseError || !lease) throw new Error('No active lease found')

				const leaseData = lease as Record<string, unknown>

				const { data: userData } = await supabase.auth.getUser()
				const userId = userData?.user?.id ?? null

				const { data, error } = await supabase
					.from('maintenance_requests')
					.insert({
						title: request.title,
						description: request.description,
						priority: request.priority,
						status: 'open',
						tenant_id: tenantId,
						unit_id: leaseData.unit_id as string,
						owner_user_id: requireOwnerUserId(leaseData.owner_user_id as string | undefined)
					})
					.select('id, title, description, priority, status, created_at, updated_at, completed_at, unit_id, requested_by')
					.single()

				if (error) throw new Error(error.message)

				const row = data as Record<string, unknown>
				const requestId = row.id as string

				// Upload photos after request creation (non-blocking failures)
				const files = request.stagedFiles ?? []
				for (const file of files.slice(0, 5)) {
					try {
						const ext = file.name.split('.').pop() ?? 'jpg'
						const storagePath = `${requestId}/${crypto.randomUUID()}.${ext}`

						const { error: uploadError } = await supabase.storage
							.from('maintenance-photos')
							.upload(storagePath, file)

						if (uploadError) {
							logger.error('Photo upload failed', { metadata: { request_id: requestId, file_name: file.name } }, uploadError)
							continue
						}

						await supabase
							.from('maintenance_request_photos')
							.insert({
								maintenance_request_id: requestId,
								storage_path: storagePath,
								file_name: file.name,
								file_size: file.size,
								mime_type: file.type || 'image/jpeg',
								uploaded_by: userId
							})
					} catch (photoErr) {
						logger.error('Photo processing failed', { metadata: { request_id: requestId, file_name: file.name } }, photoErr)
					}
				}

				return {
					id: requestId,
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
			}
		})
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useMaintenanceRequestCreateMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantMaintenanceMutationFactories.create(),
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
