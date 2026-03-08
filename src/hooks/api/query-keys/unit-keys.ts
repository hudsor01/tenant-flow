/**
 * Unit Query Keys & Options
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
import { sanitizeSearchInput } from '#lib/sanitize-search'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse } from '#types/api-contracts'
import type { Unit } from '#types/core'
import type { UnitStats } from '#types/stats'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Unit query filters
 */
export interface UnitFilters {
	property_id?: string
	status?: 'available' | 'occupied' | 'maintenance' | 'reserved'
	search?: string
	limit?: number
	offset?: number
}

const UNIT_SELECT_COLUMNS =
	'id, property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, rent_currency, rent_period, status, created_at, updated_at'

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Unit query factory
 */
export const unitQueries = {
	all: () => ['units'] as const,
	lists: () => [...unitQueries.all(), 'list'] as const,

	/**
	 * Unit list with optional filters
	 * Always filters inactive units unless status is explicitly provided
	 */
	list: (filters?: UnitFilters) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<Unit>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('units')
					.select(UNIT_SELECT_COLUMNS, { count: 'exact' })
					.order('created_at', { ascending: false })

				// Filter inactive by default unless a specific status is requested
				if (filters?.status) {
					q = q.eq('status', filters.status)
				} else {
					q = q.neq('status', 'inactive')
				}

				if (filters?.property_id) {
					q = q.eq('property_id', filters.property_id)
				}

				if (filters?.search) {
					const safe = sanitizeSearchInput(filters.search)
					if (safe) {
						q = q.ilike('unit_number', `%${safe}%`)
					}
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'units')

				return {
					data: (data as Unit[]) ?? [],
					total: count ?? 0,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total: count ?? 0,
						totalPages: Math.ceil((count ?? 0) / limit)
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Units for a specific property (paginated)
	 * Returns array of units filtered to a property
	 */
	listByProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), 'by-property', property_id],
			queryFn: async (): Promise<Unit[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('units')
					.select(UNIT_SELECT_COLUMNS)
					.eq('property_id', property_id)
					.neq('status', 'inactive')
					.order('unit_number', { ascending: true })

				if (error) handlePostgrestError(error, 'units')

				return (data as Unit[]) ?? []
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id
		}),

	details: () => [...unitQueries.all(), 'detail'] as const,

	/**
	 * Single unit by ID
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...unitQueries.details(), id],
			queryFn: async (): Promise<Unit> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('units')
					.select(UNIT_SELECT_COLUMNS)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'units')

				return data as Unit
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * All units for a property (non-paginated array)
	 * Optimized for property detail pages showing all units
	 */
	byProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'by-property', property_id],
			queryFn: async (): Promise<Unit[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('units')
					.select(UNIT_SELECT_COLUMNS)
					.eq('property_id', property_id)
					.neq('status', 'inactive')
					.order('unit_number', { ascending: true })

				if (error) handlePostgrestError(error, 'units')

				return (data as Unit[]) ?? []
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id
		}),

	/**
	 * Unit statistics
	 * Aggregates counts by status directly via PostgREST
	 */
	stats: () =>
		queryOptions({
			queryKey: [...unitQueries.all(), 'stats'],
			queryFn: async (): Promise<UnitStats> => {
				const supabase = createClient()

				const [totalResult, occupiedResult, availableResult, maintenanceResult, rentResult] =
					await Promise.all([
						supabase
							.from('units')
							.select('id', { count: 'exact', head: true })
							.neq('status', 'inactive'),
						supabase
							.from('units')
							.select('id', { count: 'exact', head: true })
							.eq('status', 'occupied'),
						supabase
							.from('units')
							.select('id', { count: 'exact', head: true })
							.eq('status', 'available'),
						supabase
							.from('units')
							.select('id', { count: 'exact', head: true })
							.eq('status', 'maintenance'),
						supabase
							.from('units')
							.select('rent_amount')
							.neq('status', 'inactive')
					])

				if (totalResult.error) handlePostgrestError(totalResult.error, 'units')
				if (occupiedResult.error) handlePostgrestError(occupiedResult.error, 'units')
				if (availableResult.error) handlePostgrestError(availableResult.error, 'units')
				if (maintenanceResult.error) handlePostgrestError(maintenanceResult.error, 'units')
				if (rentResult.error) handlePostgrestError(rentResult.error, 'units')

				const total = totalResult.count ?? 0
				const occupied = occupiedResult.count ?? 0
				const available = availableResult.count ?? 0
				const maintenance = maintenanceResult.count ?? 0
				const vacant = available
				const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

				const rentAmounts = (rentResult.data ?? []).map(
					(r: { rent_amount: number | null }) => r.rent_amount ?? 0
				)
				const totalActualRent = rentAmounts.reduce((sum: number, amt: number) => sum + amt, 0)
				const averageRent = rentAmounts.length > 0 ? totalActualRent / rentAmounts.length : 0

				return {
					total,
					occupied,
					vacant,
					maintenance,
					available,
					averageRent,
					occupancyRate,
					occupancyChange: 0,
					totalPotentialRent: totalActualRent,
					totalActualRent
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000
		})
}
