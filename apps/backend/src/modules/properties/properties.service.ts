import type { PropertyStatus } from '@repo/shared/constants/status-types'
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	Optional
} from '@nestjs/common'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/api-contracts'
import type { Property, PropertyType } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import type { Cache } from 'cache-manager'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { SagaBuilder } from '../../shared/patterns/saga.pattern'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { VALID_PROPERTY_TYPES } from './utils/csv-normalizer'

function getTokenFromRequest(req: AuthenticatedRequest): string | null {
	const authHeader = req.headers?.authorization as string | undefined
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.substring(7)
}

@Injectable()
export class PropertiesService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertiesService.name)
	}

	private async invalidatePropertyStatsCache(user_id: string): Promise<void> {
		const cacheKey = `property-stats:${user_id}`
		try {
			await this.cacheManager.del(cacheKey)
			this.logger.debug('Invalidated property stats cache', { user_id })
		} catch (error) {
			this.logger.error('Failed to invalidate property stats cache', {
				error: error instanceof Error ? error.message : 'Unknown error',
				user_id
			})
		}
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
	): Promise<Property | null> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Property lookup requested without auth token', {
				property_id
			})
			return null
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
			return null
		}

		return data as Property
	}

	async create(
		req: AuthenticatedRequest,
		request: CreatePropertyRequest
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const owner_id = req.user.id
		const client = this.supabase.getUserClient(token)

		const insertData: Database['public']['Tables']['properties']['Insert'] = {
			property_owner_id: owner_id,
			name: request.name,
			address_line1: request.address_line1,
			city: request.city,
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

		await this.invalidatePropertyStatsCache(owner_id)

		this.logger.log('Property created successfully', {
			property_id: data.id
		})
		return data as Property
	}

	async update(
		req: AuthenticatedRequest,
		property_id: string,
		request: UpdatePropertyRequest,
		expectedVersion?: number
	): Promise<Property | null> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		const existing = await this.findOne(req, property_id)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		if (request.name && !request.name.trim()) {
			throw new BadRequestException('Property name cannot be empty')
		}
		if (
			request.property_type &&
			!VALID_PROPERTY_TYPES.includes(request.property_type as PropertyType)
		) {
			throw new BadRequestException('Invalid property type')
		}

		const updated_ata: Database['public']['Tables']['properties']['Update'] = {
			updated_at: new Date().toISOString()
		}

		if (request.name !== undefined) updated_ata.name = request.name.trim()
		if (request.address_line1 !== undefined)
			updated_ata.address_line1 = request.address_line1.trim()
		if (request.city !== undefined) updated_ata.city = request.city.trim()
		if (request.state !== undefined) updated_ata.state = request.state.trim()
		if (request.postal_code !== undefined)
			updated_ata.postal_code = request.postal_code.trim()
		if (request.property_type !== undefined) {
			updated_ata.property_type = request.property_type as PropertyType
		}

		let query = client.from('properties').update(updated_ata).eq('id', property_id)

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

		const user_id = req.user.id
		await this.invalidatePropertyStatsCache(user_id)

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
				compensate: async (result: { previousStatus: string }) => {
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

		await this.invalidatePropertyStatsCache(user_id)

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
