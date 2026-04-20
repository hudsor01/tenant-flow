/**
 * Maintenance Query Keys, Options & Mutations
 * Query and mutation factories for maintenance and vendor domains.
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - mutationOptions() for type-safe mutation configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from '../mutation-keys'
import type { PaginatedResponse } from '#types/api-contracts'
import type { MaintenanceRequest } from '#types/core'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '#lib/validation/maintenance'
import type {
	Vendor,
	VendorCreateInput,
	VendorUpdateInput
} from '#types/domain'

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
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				const { data, error } = await supabase.rpc('get_maintenance_stats', {
					p_user_id: user.id,
				})

				if (error) handlePostgrestError(error, 'maintenance_requests')

				const stats = data as Record<string, number>
				return {
					open: stats.open ?? 0,
					assigned: stats.assigned ?? 0,
					in_progress: stats.in_progress ?? 0,
					needs_reassignment: stats.needs_reassignment ?? 0,
					completed: stats.completed ?? 0,
					cancelled: stats.cancelled ?? 0,
					on_hold: stats.on_hold ?? 0,
					total: stats.total ?? 0,
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
					.limit(50)

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return (data as MaintenanceRequest[]) ?? []
			},
			staleTime: 30 * 1000,
			gcTime: 5 * 60 * 1000
		}),

	photos: (requestId: string) =>
		queryOptions({
			queryKey: [...maintenanceQueries.all(), 'photos', requestId],
			queryFn: async () => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('maintenance_request_photos')
					.select('id, maintenance_request_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at')
					.eq('maintenance_request_id', requestId)
					.order('created_at', { ascending: true })
					.limit(20)

				if (error) handlePostgrestError(error, 'maintenance_request_photos')

				type PhotoRow = {
					id: string
					maintenance_request_id: string
					storage_path: string
					file_name: string
					file_size: number | null
					mime_type: string
					uploaded_by: string | null
					created_at: string
				}
				const rows = (data ?? []) as PhotoRow[]

				// Bucket is private — getPublicUrl() would return a 403 URL. Batch-sign
				// all storage paths in one round-trip so <img>/<video> tags can render
				// without the client having to attach a JWT header on each request.
				if (rows.length === 0) {
					return rows.map(r => ({ ...r, signed_url: null as string | null }))
				}
				const paths = rows.map(r => r.storage_path)
				const { data: signed } = await supabase.storage
					.from('maintenance-photos')
					.createSignedUrls(paths, 3600)

				const urlByPath = new Map<string, string>()
				for (const entry of signed ?? []) {
					if (entry.path && entry.signedUrl) {
						urlByPath.set(entry.path, entry.signedUrl)
					}
				}
				return rows.map(r => ({
					...r,
					signed_url: urlByPath.get(r.storage_path) ?? null
				}))
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!requestId
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

}

/** Variables for update mutation including optional optimistic locking version */
export interface MaintenanceUpdateMutationVariables {
	id: string
	data: MaintenanceRequestUpdate
	version?: number
}

export const maintenanceMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.create,
			mutationFn: async (
				data: MaintenanceRequestCreate
			): Promise<MaintenanceRequest> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('maintenance_requests')
					.insert({ ...data, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return created as MaintenanceRequest
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.update,
			mutationFn: async ({
				id,
				data,
				version: _version
			}: MaintenanceUpdateMutationVariables): Promise<MaintenanceRequest> => {
				// Note: version is intentionally unused -- optimistic locking via version
				// is not implemented in the DB schema. The parameter is kept in the
				// interface for future compatibility.
				const supabase = createClient()

				const { data: updated, error } = await supabase
					.from('maintenance_requests')
					.update(data)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'maintenance_requests')

				return updated as MaintenanceRequest
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.maintenance.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.delete()
					.eq('id', id)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		}),

	uploadPhoto: () =>
		mutationOptions<
			{ id: string; storage_path: string; file_name: string },
			Error,
			{ requestId: string; file: File }
		>({
			mutationKey: mutationKeys.maintenance.uploadPhoto,
			mutationFn: async ({ requestId, file }) => {
				const supabase = createClient()
				const user = await getCachedUser()
				const uploaderId = requireOwnerUserId(user?.id)

				// Generate a unique storage path under requestId folder.
				const timestamp = Date.now()
				const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
				const storagePath = `${requestId}/${timestamp}-${safeName}`

				const { error: uploadError } = await supabase.storage
					.from('maintenance-photos')
					.upload(storagePath, file, { contentType: file.type, upsert: false })
				if (uploadError) throw uploadError

				const { data: row, error: dbError } = await supabase
					.from('maintenance_request_photos')
					.insert({
						maintenance_request_id: requestId,
						storage_path: storagePath,
						file_name: file.name,
						file_size: file.size,
						mime_type: file.type,
						uploaded_by: uploaderId
					})
					.select('id, storage_path, file_name')
					.single()
				if (dbError) {
					// Rollback storage upload on DB failure so we don't orphan blobs.
					await supabase.storage
						.from('maintenance-photos')
						.remove([storagePath])
					handlePostgrestError(dbError, 'maintenance_request_photos')
				}
				return row as { id: string; storage_path: string; file_name: string }
			}
		}),

	deletePhoto: () =>
		mutationOptions<void, Error, { photoId: string; storagePath: string }>({
			mutationKey: mutationKeys.maintenance.deletePhoto,
			mutationFn: async ({ photoId, storagePath }) => {
				const supabase = createClient()
				const { error: dbError } = await supabase
					.from('maintenance_request_photos')
					.delete()
					.eq('id', photoId)
				if (dbError) handlePostgrestError(dbError, 'maintenance_request_photos')

				// Storage remove is best-effort — if RLS blocks, we still dropped
				// the DB row so the UI reflects the intended state.
				await supabase.storage
					.from('maintenance-photos')
					.remove([storagePath])
					.catch(() => {})
			}
		})
}

// Explicit column list for vendor queries -- no select('*')
const VENDOR_SELECT_COLUMNS =
	'id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at'

export const vendorMutations = {
	create: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'create'] as const,
			mutationFn: async (data: VendorCreateInput): Promise<Vendor> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('vendors')
					.insert({ ...data, owner_user_id: ownerId })
					.select(VENDOR_SELECT_COLUMNS)
					.single()

				if (error) handlePostgrestError(error, 'vendors')

				return created as Vendor
			}
		}),

	update: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'update'] as const,
			mutationFn: async ({
				id,
				data
			}: {
				id: string
				data: VendorUpdateInput
			}): Promise<Vendor> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('vendors')
					.update(data)
					.eq('id', id)
					.select(VENDOR_SELECT_COLUMNS)
					.single()

				if (error) handlePostgrestError(error, 'vendors')

				return updated as Vendor
			}
		}),

	delete: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'delete'] as const,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('vendors')
					.delete()
					.eq('id', id)

				if (error) handlePostgrestError(error, 'vendors')
			}
		}),

	assign: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'assign'] as const,
			mutationFn: async ({
				vendorId,
				maintenanceId
			}: {
				vendorId: string
				maintenanceId: string
			}): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.update({ vendor_id: vendorId, status: 'assigned' })
					.eq('id', maintenanceId)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		}),

	unassign: () =>
		mutationOptions({
			mutationKey: ['mutations', 'vendors', 'unassign'] as const,
			mutationFn: async (maintenanceId: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('maintenance_requests')
					.update({ vendor_id: null, status: 'needs_reassignment' })
					.eq('id', maintenanceId)

				if (error) handlePostgrestError(error, 'maintenance_requests')
			}
		})
}
