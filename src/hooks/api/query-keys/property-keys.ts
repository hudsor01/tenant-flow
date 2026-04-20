import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createLogger, logger } from '#lib/frontend-logger'
import { sanitizeSearchInput } from '#lib/sanitize-search'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { mutationKeys } from '../mutation-keys'
import type { PaginatedResponse } from '#types/api-contracts'
import type { Property, PropertyStatus, PropertyType } from '#types/core'
import type { Tables } from '#types/supabase'
import type {
	PropertyCreate,
	PropertyUpdate
} from '#lib/validation/properties'

export interface PropertyFilters {
	status?: PropertyStatus
	property_type?: PropertyType
	search?: string
	limit?: number
	offset?: number
}

const PROPERTY_SELECT_COLUMNS =
	'id, owner_user_id, name, address_line1, address_line2, city, state, postal_code, country, property_type, status, stripe_connected_account_id, date_sold, sale_price, created_at, updated_at'

export const propertyQueries = {
	all: () => ['properties'] as const,

	lists: () => [...propertyQueries.all(), 'list'] as const,

	// Always filters inactive properties unless status is explicitly provided
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

	details: () => [...propertyQueries.all(), 'detail'] as const,

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

	performance: (property_id: string) =>
		queryOptions({
			queryKey: [...propertyQueries.detail(property_id).queryKey, 'performance'],
			queryFn: async () => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) return null
				const { data, error } = await supabase.rpc('get_property_performance_analytics', {
					p_user_id: user.id,
					p_property_id: property_id,
					p_timeframe: 'ytd'
				})
				if (error) handlePostgrestError(error, 'property performance')
				const rows = (data ?? []) as Array<{
					property_id: string
					property_name: string
					timeframe: string
					total_revenue: number
					total_expenses: number
					net_income: number
					occupancy_rate: number
				}>
				return rows[0] ?? null
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id
		}),

	// image_url stores a relative storage path; resolve to public URL at read time
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

export const propertyMutations = {
	create: () =>
		mutationOptions<Property, unknown, PropertyCreate>({
			mutationKey: mutationKeys.properties.create,
			mutationFn: async (data: PropertyCreate): Promise<Property> => {
				const supabase = createClient()
				const user = await getCachedUser()
				const ownerId = requireOwnerUserId(user?.id)

				const { data: created, error } = await supabase
					.from('properties')
					.insert({ ...data, owner_user_id: ownerId })
					.select()
					.single()

				if (error) handlePostgrestError(error, 'properties')

				return created as Property
			}
		}),

	update: () =>
		mutationOptions<Property, unknown, { id: string; data: PropertyUpdate; version?: number }>({
			mutationKey: mutationKeys.properties.update,
			mutationFn: async ({
				id,
				data,
				version
			}): Promise<Property> => {
				const supabase = createClient()
				const updatePayload = version ? { ...data, version } : { ...data }
				const { data: updated, error } = await supabase
					.from('properties')
					.update(updatePayload)
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'properties')

				return updated as Property
			}
		}),

	delete: () =>
		mutationOptions<void, unknown, string>({
			mutationKey: mutationKeys.properties.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('properties')
					.update({ status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'properties')
			}
		}),

	markSold: () =>
		mutationOptions<{ success: boolean; message: string }, unknown, { id: string; dateSold: Date; salePrice: number }>({
			mutationKey: mutationKeys.properties.markSold,
			mutationFn: async ({
				id,
				dateSold,
				salePrice
			}): Promise<{ success: boolean; message: string }> => {
				const supabase = createClient()
				const { data: updated, error } = await supabase
					.from('properties')
					.update({
						status: 'sold',
						date_sold: dateSold.toISOString(),
						sale_price: salePrice
					})
					.eq('id', id)
					.select()
					.single()

				if (error) handlePostgrestError(error, 'properties')

				logger.info('Property marked as sold', { property_id: id, updated })
				return { success: true, message: 'Property marked as sold' }
			}
		}),

	deleteImage: () =>
		mutationOptions<{ success: boolean }, unknown, { imageId: string; property_id: string; imagePath?: string }>({
			mutationKey: mutationKeys.properties.deleteImage,
			mutationFn: async ({
				imageId,
				imagePath
			}) => {
				const supabase = createClient()
				const mutationLogger = createLogger({ component: 'PropertyMutations' })

				const { error: dbError } = await supabase
					.from('property_images')
					.delete()
					.eq('id', imageId)

				if (dbError) throw new Error(dbError.message)

				if (imagePath) {
					try {
						await supabase.storage.from('property-images').remove([imagePath])
					} catch {
						mutationLogger.warn('Storage deletion failed', {
							action: 'delete_storage_image_failed',
							metadata: { imagePath }
						})
					}
				}

				return { success: true }
			}
		})
}
