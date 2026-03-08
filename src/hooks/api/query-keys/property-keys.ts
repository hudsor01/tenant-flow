/**
 * Property Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * Stats/performance/analytics queries split to property-stats-keys.ts.
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
import type { Property, PropertyStatus, PropertyType } from '#types/core'
import type { Tables } from '#types/supabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Property query filters for list queries
 */
export interface PropertyFilters {
	status?: PropertyStatus
	property_type?: PropertyType
	search?: string
	limit?: number
	offset?: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

				if (filters?.status) {
					q = q.eq('status', filters.status)
				} else {
					q = q.neq('status', 'inactive')
				}

				if (filters?.property_type) {
					q = q.eq('property_type', filters.property_type)
				}

				if (filters?.search) {
					const safe = sanitizeSearchInput(filters.search)
					if (safe) {
						q = q.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`)
					}
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
	 * Property images for a specific property
	 * Uses Supabase client directly with RLS
	 *
	 * Note: image_url stores relative path (e.g., "{property_id}/{filename}")
	 * This query transforms it to full public URL using Supabase storage API
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

				return (data as Tables<'property_images'>[]).map(image => {
					const isFullUrl = image.image_url.startsWith('http')
					if (isFullUrl) {
						return image
					}
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
