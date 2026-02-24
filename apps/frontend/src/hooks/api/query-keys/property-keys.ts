/**
 * Property Query Keys & Options
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
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type {
	Property,
	PropertyPerformance
} from '@repo/shared/types/core'
import type { PropertyStats } from '@repo/shared/types/stats'
import type { Tables } from '@repo/shared/types/supabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Property query filters
 */
export interface PropertyFilters {
	status?: 'active' | 'sold' | 'inactive'
	property_type?:
		| 'SINGLE_FAMILY'
		| 'MULTI_FAMILY'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	search?: string
	limit?: number
	offset?: number
}

const PROPERTY_SELECT_COLUMNS =
	'id, owner_user_id, name, address_line1, address_line2, city, state, postal_code, country, property_type, status, stripe_connected_account_id, date_sold, sale_price, created_at, updated_at'

// ============================================================================
// QUERY OPTIONS
// ============================================================================

/**
 * Property query factory
 * Colocated queryOptions for use with useQuery, useQueries, prefetch
 */
export const propertyQueries = {
	/**
	 * Base key for all property queries
	 */
	all: () => ['properties'] as const,

	/**
	 * Base key for all property lists
	 */
	lists: () => [...propertyQueries.all(), 'list'] as const,

	/**
	 * Property list with optional filters
	 * Always filters inactive properties unless status is explicitly provided
	 */
	list: (filters?: PropertyFilters) =>
		queryOptions({
			queryKey: [...propertyQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<Property>> => {
				const supabase = createClient()
				const limit = filters?.limit ?? 50
				const offset = filters?.offset ?? 0

				let q = supabase
					.from('properties')
					.select(PROPERTY_SELECT_COLUMNS, { count: 'exact' })
					.order('created_at', { ascending: false })

				// Filter inactive by default unless a specific status is requested
				if (filters?.status) {
					q = q.eq('status', filters.status)
				} else {
					q = q.neq('status', 'inactive')
				}

				if (filters?.property_type) {
					q = q.eq('property_type', filters.property_type)
				}

				if (filters?.search) {
					q = q.or(
						`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
					)
				}

				q = q.range(offset, offset + limit - 1)

				const { data, error, count } = await q

				if (error) handlePostgrestError(error, 'properties')

				const total = count ?? 0
				const totalPages = Math.ceil(total / limit)

				return {
					data: (data as Property[]) ?? [],
					total,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total,
						totalPages
					}
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Properties with units (e.g., management dashboard)
	 */
	withUnits: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'with-units'] as const,
			queryFn: async (): Promise<Property[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('properties')
					.select('*, units(*)')
					.neq('status', 'inactive')
					.order('created_at', { ascending: false })

				if (error) handlePostgrestError(error, 'properties')

				return (data as Property[]) ?? []
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Base key for all property details
	 */
	details: () => [...propertyQueries.all(), 'detail'] as const,

	/**
	 * Single property by ID
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.details(), id],
			queryFn: async (): Promise<Property> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('properties')
					.select(PROPERTY_SELECT_COLUMNS)
					.eq('id', id)
					.single()

				if (error) handlePostgrestError(error, 'properties')

				return data as Property
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id
		}),

	/**
	 * Property statistics
	 * Aggregates active, total counts directly via PostgREST
	 */
	stats: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'stats'],
			queryFn: async (): Promise<PropertyStats> => {
				const supabase = createClient()
				const [activeResult, totalResult, occupiedResult] = await Promise.all([
					supabase
						.from('properties')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'active'),
					supabase
						.from('properties')
						.select('id', { count: 'exact', head: true })
						.neq('status', 'inactive'),
					supabase
						.from('units')
						.select('id', { count: 'exact', head: true })
						.eq('status', 'occupied')
				])

				if (activeResult.error) handlePostgrestError(activeResult.error, 'properties')
				if (totalResult.error) handlePostgrestError(totalResult.error, 'properties')
				if (occupiedResult.error) handlePostgrestError(occupiedResult.error, 'properties')

				const total = totalResult.count ?? 0
				const occupied = occupiedResult.count ?? 0
				const vacant = total - occupied
				const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

				return {
					total,
					occupied,
					vacant,
					occupancyRate,
					totalMonthlyRent: 0,
					averageRent: 0
				}
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000 // Keep 30 minutes for stats
		}),

	/**
	 * Property performance metrics
	 * Uses get_property_performance_with_trends RPC
	 */
	performance: () =>
		queryOptions({
			queryKey: [...propertyQueries.all(), 'performance'],
			queryFn: async (): Promise<PropertyPerformance[]> => {
				// TODO: Map RPC return shape to PropertyPerformance once RPC args are confirmed
				// The RPC requires p_user_id — returning empty array until user context is wired
				return [] as PropertyPerformance[]
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	analytics: {
		occupancy: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'occupancy'] as const,
				queryFn: async (): Promise<unknown> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_occupancy_trends_optimized',
						{ p_user_id: user.id, p_months: 12 }
					)
					if (error) handlePostgrestError(error, 'properties')
					return data ?? {}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		financial: () =>
			queryOptions({
				queryKey: [...propertyQueries.all(), 'analytics', 'financial'] as const,
				queryFn: async (): Promise<unknown> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc('get_financial_overview', {
						p_user_id: user.id
					})
					if (error) handlePostgrestError(error, 'properties')
					return data ?? {}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),
		maintenance: () =>
			queryOptions({
				queryKey: [
					...propertyQueries.all(),
					'analytics',
					'maintenance'
				] as const,
				queryFn: async (): Promise<unknown> => {
					const supabase = createClient()
					const {
						data: { user }
					} = await supabase.auth.getUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_maintenance_analytics',
						{ user_id: user.id }
					)
					if (error) handlePostgrestError(error, 'properties')
					return data ?? {}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			})
	},

	/**
	 * Property images for a specific property
	 * Uses Supabase client directly with RLS
	 *
	 * Note: image_url stores relative path (e.g., "{property_id}/{filename}")
	 * This query transforms it to full public URL using Supabase storage API
	 * Note: Supabase JS client doesn't support AbortController directly
	 */
	images: (property_id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.detail(property_id).queryKey, 'images'],
			queryFn: async () => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('property_images')
					.select('*')
					.eq('property_id', property_id)
					.order('display_order', { ascending: true })

				if (error) throw new Error(error.message)

				// Transform relative paths to full public URLs
				return (data as Tables<'property_images'>[]).map(image => {
					const isFullUrl = image.image_url.startsWith('http')
					if (isFullUrl) {
						return image
					}
					// Construct full URL from relative path
					const {
						data: { publicUrl }
					} = supabase.storage
						.from('property-images')
						.getPublicUrl(image.image_url)
					return { ...image, image_url: publicUrl }
				})
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id
		})
}
