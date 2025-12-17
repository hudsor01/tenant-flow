import type { PropertyStatus } from '@repo/shared/types/core'
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type {
	PropertyCreate,
	PropertyUpdate
} from '@repo/shared/validation/properties'
import type { Property, PropertyType } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { ZeroCacheService } from '../../cache/cache.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { SagaBuilder } from '../../shared/patterns/saga.pattern'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../database/auth-token.utils'
import { VALID_PROPERTY_TYPES } from './utils/csv-normalizer'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class PropertiesService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly cache: ZeroCacheService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Invalidate all property-related caches for a user/owner
	 * Uses ZeroCacheService surgical invalidation
	 */
	private invalidatePropertyCaches(owner_user_id: string, property_id?: string): void {
		// Invalidate specific property if ID provided
		if (property_id) {
			this.cache.invalidateByEntity('properties', property_id)
		}
		// Invalidate user's property list cache
		this.cache.invalidate(`properties:owner:${owner_user_id}`)
		this.logger.debug('Invalidated property caches', { owner_user_id, property_id })
	}

	async findAll(
		userToken: string,
		query: { search?: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		const userClient = this.supabase.getUserClient(userToken)

		let queryBuilder = userClient
			.from('properties')
			.select('*')
			.order('created_at', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)

		if (query.search) {
			const sanitized = sanitizeSearchInput(query.search)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['name', 'address', 'city'])
				)
			}
		}

		const { data, error } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch properties', { error })
			return []
		}

		return (data || []) as Property[]
	}

	async findOne(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Property lookup requested without auth token', {
				property_id
			})
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('properties')
			.select('*')
			.eq('id', property_id)
			.single()

		if (error || !data) {
			this.logger.warn('Property not found or access denied', {
				property_id,
				error
			})
			throw new NotFoundException(`Property ${property_id} not found`)
		}

		return data as Property
	}

	async create(
		req: AuthenticatedRequest,
		request: PropertyCreate
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

const user_id = req.user.id
		const client = this.supabase.getUserClient(token)

		const insertData: Database['public']['Tables']['properties']['Insert'] = {
			name: request.name,
			address_line1: request.address_line1,
			city: request.city,
			owner_user_id: user_id,
			state: request.state,
			postal_code: request.postal_code,
			property_type: request.property_type as PropertyType
		}

		if (request.address_line2?.trim()) {
			insertData.address_line2 = request.address_line2.trim()
		}

		if (request.country?.trim()) {
			insertData.country = request.country.trim()
		}

		this.logger.debug('Attempting to create property', { insertData })

		const { data, error } = await client
			.from('properties')
			.insert(insertData)
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to create property', { error })
			throw new BadRequestException('Failed to create property')
		}

		if (!data) {
			this.logger.error('No data returned from insert')
			throw new BadRequestException(
				'Failed to create property - no data returned'
			)
		}

this.invalidatePropertyCaches(user_id, data.id)

		this.logger.log('Property created successfully', {
			property_id: data.id
		})
		return data as Property
	}

	async update(
		req: AuthenticatedRequest,
		property_id: string,
		request: PropertyUpdate,
		expectedVersion?: number
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify property exists and user has access (throws if not found)
		await this.findOne(req, property_id)

		if (request.name && !request.name.trim()) {
			throw new BadRequestException('Property name cannot be empty')
		}
		if (
			request.property_type &&
			!VALID_PROPERTY_TYPES.includes(request.property_type as PropertyType)
		) {
			throw new BadRequestException('Invalid property type')
		}

		const updated_data: Database['public']['Tables']['properties']['Update'] = {
			updated_at: new Date().toISOString()
		}

		if (request.name !== undefined) updated_data.name = request.name.trim()
		if (request.address_line1 !== undefined)
			updated_data.address_line1 = request.address_line1.trim()
		if (request.city !== undefined) updated_data.city = request.city.trim()
		if (request.state !== undefined) updated_data.state = request.state.trim()
		if (request.postal_code !== undefined)
			updated_data.postal_code = request.postal_code.trim()
		if (request.property_type !== undefined) {
			updated_data.property_type = request.property_type as PropertyType
		}

		let query = client.from('properties').update(updated_data).eq('id', property_id)

		if (expectedVersion !== undefined) {
			query = query.eq('version', expectedVersion)
		}

		const { data, error } = await query.select().single()

		if (error || !data) {
			if (error?.code === 'PGRST116' || !data) {
				this.logger.warn('Optimistic locking conflict detected', {
					property_id,
					expectedVersion
				})
				throw new ConflictException(
					'Property was modified by another user. Please refresh and try again.'
				)
			}

			this.logger.error('Failed to update property', {
				error,
				property_id
			})
			throw new BadRequestException('Failed to update property')
		}

		// Invalidate caches using the current user's ID
		const user_id = req.user.id
		this.invalidatePropertyCaches(user_id, property_id)

		return data as Property
	}

	async remove(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<{ success: boolean; message: string }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const user_id = req.user.id

		const existing = await this.findOne(req, property_id)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		const result = await new SagaBuilder(this.logger)
			.addStep({
				name: 'Mark property as INACTIVE in database',
				execute: async () => {
					const { data, error } = await client
						.from('properties')
						.update({
							status: 'inactive' as PropertyStatus,
							updated_at: new Date().toISOString()
						})
						.eq('id', property_id)
						.select()
						.single()

					if (error) {
						this.logger.error('Failed to mark property as inactive', {
							error,
							user_id,
							property_id
						})
						throw new BadRequestException('Failed to delete property')
					}

					this.logger.log('Marked property as INACTIVE', { property_id })
					return { previousStatus: existing.status, data }
				},
				compensate: async (result: { previousStatus: PropertyStatus }) => {
					const { error } = await client
						.from('properties')
						.update({
							status: result.previousStatus,
							updated_at: new Date().toISOString()
						})
						.eq('id', property_id)

					if (error) {
						this.logger.error(
							'Failed to restore property status during compensation',
							{
								error,
								property_id,
								previousStatus: result.previousStatus
							}
						)
						throw error
					}

					this.logger.log('Restored property status during compensation', {
						property_id,
						status: result.previousStatus
					})
				}
			})
			.execute()

		if (!result.success) {
			this.logger.error('Property deletion saga failed', {
				error: result.error?.message,
				property_id,
				completedSteps: result.completedSteps,
				compensatedSteps: result.compensatedSteps
			})
			throw new BadRequestException(
				result.error?.message || 'Failed to delete property'
			)
		}

		this.logger.log('Property deletion saga completed successfully', {
			property_id,
			completedSteps: result.completedSteps
		})

		// Invalidate caches using the current user's ID
		this.invalidatePropertyCaches(user_id, property_id)

		return { success: true, message: 'Property deleted successfully' }
	}

	async findAllWithUnits(
		req: AuthenticatedRequest,
		query: { search: string | null; limit: number; offset: number }
	): Promise<{ data: Property[]; total: number; limit: number; offset: number }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			return { data: [], total: 0, limit: query.limit, offset: query.offset }
		}

		const client = this.supabase.getUserClient(token)

		const limit = Math.min(Math.max(query.limit || 10, 1), 100)
		const offset = Math.max(query.offset || 0, 0)

		let queryBuilder = client
			.from('properties')
			.select('*, units:unit(*, lease(*))', { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (query.search) {
			const sanitized = sanitizeSearchInput(query.search)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['name', 'address'])
				)
			}
		}

		const { data, error, count } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch properties with units', {
				error
			})
			return { data: [], total: 0, limit, offset }
		}

		return {
			data: (data || []) as Property[],
			total: count || 0,
			limit,
			offset
		}
	}

	async markAsSold(
		req: AuthenticatedRequest,
		property_id: string,
		dateSold: Date,
		salePrice: number
	): Promise<{ success: boolean; message: string }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		const property = await this.findOne(req, property_id)
		if (!property) {
			throw new BadRequestException('Property not found or access denied')
		}

		const { error } = await client
			.from('properties')
			.update({
				status: 'sold',
				date_sold: dateSold.toISOString().split('T')[0] as string, // Convert to YYYY-MM-DD format for date type
				sale_price: salePrice,
				updated_at: new Date().toISOString()
			})
			.eq('id', property_id)

		if (error) {
			this.logger.error('Failed to mark property as sold', {
				error,
				property_id
			})
			throw new BadRequestException(
				'Failed to mark property as sold: ' + error.message
			)
		}

		this.logger.log('Property marked as sold', {
			property_id,
			salePrice,
			dateSold: dateSold.toISOString()
		})

		return {
			success: true,
			message: `Property marked as sold for $${salePrice.toLocaleString()}. Records will be retained for 7 years as required.`
		}
	}

	async getPropertyUnits(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<unknown[]> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		const property = await this.findOne(req, property_id)
		if (!property)
			throw new BadRequestException('Property not found or access denied')

		const { data, error } = await client
			.from('units')
			.select('*')
			.eq('property_id', property_id)
			.order('unit_number', { ascending: true })

		if (error) {
			this.logger.error('Failed to get property units', {
				error,
				property_id
			})
			return []
		}

		return data || []
	}
}
