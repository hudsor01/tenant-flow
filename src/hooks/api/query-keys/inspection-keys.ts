/**
 * Inspection Query Keys & Options
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
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
	Inspection,
	InspectionListItem
} from '#types/sections/inspections'

// ============================================================================
// SELECT COLUMNS
// ============================================================================

const INSPECTION_SELECT_COLUMNS =
	'id, lease_id, property_id, unit_id, owner_user_id, inspection_type, status, scheduled_date, completed_at, tenant_reviewed_at, overall_condition, owner_notes, created_at, updated_at'

const INSPECTION_DETAIL_SELECT =
	'id, lease_id, property_id, unit_id, owner_user_id, inspection_type, status, scheduled_date, completed_at, tenant_reviewed_at, tenant_signature_data, overall_condition, owner_notes, tenant_notes, created_at, updated_at, inspection_rooms(id, room_name, room_type, condition_rating, notes, created_at, updated_at, inspection_photos(id, inspection_room_id, inspection_id, storage_path, file_name, file_size, mime_type, caption, uploaded_by, created_at))'

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Inspection query factory
 */
export const inspectionQueries = {
	all: () => ['inspections'] as const,
	lists: () => [...inspectionQueries.all(), 'list'] as const,
	byLease: (leaseId: string) => [...inspectionQueries.all(), 'lease', leaseId] as const,
	details: () => [...inspectionQueries.all(), 'detail'] as const,
	detail: (id: string) => [...inspectionQueries.details(), id] as const,

	list: () =>
		queryOptions({
			queryKey: inspectionQueries.lists(),
			queryFn: async (): Promise<InspectionListItem[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('inspections')
					.select(
						`${INSPECTION_SELECT_COLUMNS}, properties(name, address_line1), units(name), inspection_rooms(id)`,
						{ count: 'exact' }
					)
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'inspections')

				return (data ?? []).map(row => {
					const property = (row.properties as unknown as { name: string; address_line1: string } | null)
					const unit = (row.units as unknown as { name: string } | null)
					const rooms = row.inspection_rooms as { id: string }[] | null

					return {
						id: row.id,
						lease_id: row.lease_id,
						property_id: row.property_id,
						inspection_type: row.inspection_type,
						status: row.status,
						scheduled_date: row.scheduled_date,
						completed_at: row.completed_at,
						created_at: row.created_at,
						property_name: property?.name ?? '',
						unit_name: unit?.name ?? null,
						room_count: rooms?.length ?? 0
					} satisfies InspectionListItem
				})
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	byLeaseQuery: (leaseId: string) =>
		queryOptions({
			queryKey: inspectionQueries.byLease(leaseId),
			queryFn: async (): Promise<Inspection[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('inspections')
					.select(INSPECTION_SELECT_COLUMNS)
					.eq('lease_id', leaseId)
					.order('created_at', { ascending: true })

				if (error) handlePostgrestError(error, 'inspections')

				return (data ?? []) as unknown as Inspection[]
			},
			enabled: !!leaseId,
			...QUERY_CACHE_TIMES.DETAIL
		}),

	detailQuery: (id: string) =>
		queryOptions({
			queryKey: inspectionQueries.detail(id),
			queryFn: async (): Promise<Inspection> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('inspections')
					.select(INSPECTION_DETAIL_SELECT)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'inspections')

				// Transform nested inspection_photos to include publicUrl
				const row = data as typeof data & {
					inspection_rooms?: Array<{
						id: string
						room_name: string
						room_type: string
						condition_rating: string
						notes: string | null
						created_at: string
						updated_at: string
						inspection_photos?: Array<{
							id: string
							inspection_room_id: string
							inspection_id: string
							storage_path: string
							file_name: string
							file_size: number | null
							mime_type: string
							caption: string | null
							uploaded_by: string | null
							created_at: string
						}>
					}>
				}

				const rooms = (row?.inspection_rooms ?? []).map(room => ({
					...room,
					photos: (room.inspection_photos ?? []).map(photo => {
						const { data: urlData } = supabase.storage
							.from('inspection-photos')
							.getPublicUrl(photo.storage_path)
						return {
							...photo,
							publicUrl: urlData.publicUrl
						}
					})
				}))

				return {
					...row,
					rooms
				} as unknown as Inspection
			},
			enabled: !!id,
			...QUERY_CACHE_TIMES.DETAIL
		})
}
