/**
 * Maintenance Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '#shared/types/api-contracts'
import type { MaintenanceRequest } from '#shared/types/core'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Maintenance query filters
 */
export interface MaintenanceFilters {
	unit_id?: string
	property_id?: string
	priority?: string
	status?: string
	limit?: number
	offset?: number
}

// All columns on maintenance_requests (no category column in DB schema)
const MAINTENANCE_SELECT_COLUMNS =
	'id, owner_user_id, unit_id, tenant_id, title, description, priority, status, vendor_id, requested_by, assigned_to, estimated_cost, actual_cost, scheduled_date, completed_at, inspection_date, inspection_findings, inspector_id, created_at, updated_at'

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Maintenance query factory
 * All queryFns use supabase.from('maintenance_requests') — no apiRequest calls.
 * RLS enforces owner_user_id = auth.uid() on every query.
 */
export const maintenanceQueries = {
	all: () => ['maintenance'] as const,
	lists: () => [...maintenanceQueries.all(), 'list'] as const,

	list: (filters?: MaintenanceFilters) =>
		queryOptions({
			queryKey: [...maintenanceQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<MaintenanceRequest>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let data: MaintenanceRequest[] | null
				let error: { message: string; code: string; details: string; hint: string } | null
				let count: number | null

				if (filters?.property_id) {
					// Join through units when filtering by property_id
					// Cast to unknown first because the join changes the return type shape
					const result = await supabase
						.from('maintenance_requests')
						.select(
							'id, owner_user_id, unit_id, tenant_id, title, description, priority, status, vendor_id, requested_by, assigned_to, estimated_cost, actual_cost, scheduled_date, completed_at, inspection_date, inspection_findings, inspector_id, created_at, updated_at, units!inner(property_id)',
							{ count: 'exact' }
						)
						.eq('units.property_id', filters.property_id)
						.order('created_at', { ascending: false })
						.range(offset, offset + limit - 1)
					data = result.data as unknown as MaintenanceRequest[]
					error = result.error
					count = result.count
				} else {
					let q = supabase
						.from('maintenance_requests')
						.select(MAINTENANCE_SELECT_COLUMNS, { count: 'exact' })
						.order('created_at', { ascending: false })

					if (filters?.unit_id) {
						q = q.eq('unit_id', filters.unit_id)
					}
					if (filters?.priority) {
						q = q.eq('priority', filters.priority)
					}
					if (filters?.status) {
						q = q.eq('status', filters.status)
					}

					q = q.range(offset, offset + limit - 1)

					const result = await q
					data = result.data as MaintenanceRequest[]
					error = result.error
					count = result.count
				}

				if (error) handlePostgrestError(error as Parameters<typeof handlePostgrestError>[0], 'maintenance_requests')

				const total = count ?? 0
				const totalPages = Math.ceil(total / limit)

				return {
					data: data ?? [],
					total,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total,
						totalPages
					}
				}
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	details: () => [...maintenanceQueries.all(), 'detail'] as const,

	detail: (id: string) =>
		queryOptions({
			queryKey: [...maintenanceQueries.details(), id],
			queryFn: async (): Promise<MaintenanceRequest> => {
				const supabase = createClient()
				// Include vendor relation in detail view for vendor name display
				const { data, error } = await supabase
					.from('maintenance_requests')
					.select(`${MAINTENANCE_SELECT_COLUMNS}, vendors(id, name, trade)`)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return data as MaintenanceRequest
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	stats: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'stats'],
			queryFn: async () => {
				const supabase = createClient()
				// Run parallel HEAD queries for each status — no data transfer, just counts
				const [
					openResult,
					assignedResult,
					inProgressResult,
					needsReassignmentResult,
					completedResult,
					cancelledResult,
					onHoldResult
				] = await Promise.all([
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'open'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'assigned'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'in_progress'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'needs_reassignment'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'completed'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'cancelled'),
					supabase
						.from('maintenance_requests')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'on_hold')
				])

				if (openResult.error)
					handlePostgrestError(openResult.error, 'maintenance_requests')
				if (assignedResult.error)
					handlePostgrestError(assignedResult.error, 'maintenance_requests')
				if (inProgressResult.error)
					handlePostgrestError(inProgressResult.error, 'maintenance_requests')
				if (needsReassignmentResult.error)
					handlePostgrestError(
						needsReassignmentResult.error,
						'maintenance_requests'
					)
				if (completedResult.error)
					handlePostgrestError(completedResult.error, 'maintenance_requests')
				if (cancelledResult.error)
					handlePostgrestError(cancelledResult.error, 'maintenance_requests')
				if (onHoldResult.error)
					handlePostgrestError(onHoldResult.error, 'maintenance_requests')

				const open = openResult.count ?? 0
				const assigned = assignedResult.count ?? 0
				const in_progress = inProgressResult.count ?? 0
				const needs_reassignment = needsReassignmentResult.count ?? 0
				const completed = completedResult.count ?? 0
				const cancelled = cancelledResult.count ?? 0
				const on_hold = onHoldResult.count ?? 0

				return {
					open,
					assigned,
					in_progress,
					needs_reassignment,
					completed,
					cancelled,
					on_hold,
					total:
						open +
						assigned +
						in_progress +
						needs_reassignment +
						completed +
						cancelled +
						on_hold
				}
			},
			...QUERY_CACHE_TIMES.STATS
		}),

	urgent: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'urgent'],
			queryFn: async (): Promise<MaintenanceRequest[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('maintenance_requests')
					.select(MAINTENANCE_SELECT_COLUMNS)
					.in('priority', ['high', 'urgent'])
					.not('status', 'in', '("completed","cancelled")')
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return (data as MaintenanceRequest[]) ?? []
			},
			staleTime: 30 * 1000,
			gcTime: 5 * 60 * 1000
		}),

	overdue: () =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'overdue'],
			queryFn: async (): Promise<MaintenanceRequest[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('maintenance_requests')
					.select(MAINTENANCE_SELECT_COLUMNS)
					.lt('scheduled_date', new Date().toISOString())
					.not('status', 'in', '("completed","cancelled")')
					.order('scheduled_date', { ascending: true })

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return (data as MaintenanceRequest[]) ?? []
			},
			...QUERY_CACHE_TIMES.STATS
		}),

	tenantPortal: () =>
		queryOptions({
			queryKey: ['tenant-portal', 'maintenance'],
			queryFn: async (): Promise<{
				requests: MaintenanceRequest[]
				total: number
				open: number
				inProgress: number
				completed: number
			}> => {
				const supabase = createClient()

				// Step 1: Get authenticated user
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				// Step 2: Resolve tenant record — maintenance_requests.tenant_id
				// references tenants.id (not auth.uid())
				const { data: tenantRecord, error: tenantError } = await supabase
					.from('tenants')
					.select('id')
					.eq('user_id', user.id)
					.single()

				if (tenantError || !tenantRecord) {
					return { requests: [], total: 0, open: 0, inProgress: 0, completed: 0 }
				}

				// Step 3: Fetch maintenance requests for this tenant
				const { data, error, count } = await supabase
					.from('maintenance_requests')
					.select(MAINTENANCE_SELECT_COLUMNS, { count: 'exact' })
					.eq('tenant_id', tenantRecord.id)
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'maintenance_requests')

				const requests = (data as MaintenanceRequest[]) ?? []
				const total = count ?? 0
				const open = requests.filter(r => r.status === 'open').length
				const inProgress = requests.filter(r => r.status === 'in_progress').length
				const completed = requests.filter(r => r.status === 'completed').length

				return { requests, total, open, inProgress, completed }
			},
			...QUERY_CACHE_TIMES.LIST
		})
}
