import type { Property, PropertyType } from '@repo/shared/types/core'
import type { PropertyInsert, PropertyUpdate } from '@repo/shared/types/api-contracts'
import type {
	PropertyCreate as CreatePropertyDto,
	PropertyUpdate as UpdatePropertyDto
} from '@repo/shared/validation/properties'
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException
} from '@nestjs/common'

import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../database/auth-token.utils'
import { VALID_PROPERTY_TYPES } from './utils/csv-normalizer'
import { AppLogger } from '../../logger/app-logger.service'
import { PropertyCacheInvalidationService } from './services/property-cache-invalidation.service'

@Injectable()
export class PropertiesService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly cacheInvalidation: PropertyCacheInvalidationService,
		private readonly logger: AppLogger
	) {}

	async findAll(
		userToken: string,
		query: { search?: string | null; status?: string | null; limit: number; offset: number }
	): Promise<{ data: Property[]; count: number }> {
		const userClient = this.supabase.getUserClient(userToken)

		let queryBuilder = userClient
			.from('properties')
			.select('*', { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)

		// Filter by status: exclude soft-deleted ('inactive') by default
		if (query.status) {
			queryBuilder = queryBuilder.eq('status', query.status)
		} else {
			queryBuilder = queryBuilder.neq('status', 'inactive')
		}

		if (query.search) {
			const sanitized = sanitizeSearchInput(query.search)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['name', 'address', 'city'])
				)
			}
		}

		const { data, error, count } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch properties', { error })
			throw new InternalServerErrorException('Failed to fetch properties')
		}

		return { data: (data || []) as Property[], count: count ?? 0 }
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
		request: CreatePropertyDto
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const user_id = req.user.id
		const client = this.supabase.getUserClient(token)

		// Check plan limit before creating
		const { data: limits, error: limitsError } = await this.supabase
			.getAdminClient()
			.rpc('get_user_plan_limits', { p_user_id: user_id })
		if (limitsError) {
			this.logger.error('Failed to fetch plan limits', { error: limitsError })
			throw new InternalServerErrorException('Could not verify plan limits')
		}
		const propertyLimit: number = (limits as Array<{ property_limit: number }> | null)?.[0]?.property_limit ?? 5

		const { count: currentCount, error: countError } = await client
			.from('properties')
			.select('*', { count: 'exact', head: true })
			.neq('status', 'inactive')

		if (countError || currentCount === null) {
			this.logger.error('Failed to fetch property count', { error: countError })
			throw new InternalServerErrorException('Could not verify property count')
		}

		if (currentCount >= propertyLimit) {
			throw new ForbiddenException({
				code: 'PLAN_LIMIT_EXCEEDED',
				message: `Your plan allows up to ${propertyLimit} propert${propertyLimit === 1 ? 'y' : 'ies'}. Upgrade to add more.`,
				limit: propertyLimit,
				current: currentCount,
				resource: 'properties'
			})
		}

		const insertData: PropertyInsert = {
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
			if (error.code === '23505') {
				throw new BadRequestException('A property with this address already exists')
			}
			if (error.code === '23503') {
				throw new BadRequestException('Invalid reference — check property type or owner')
			}
			throw new BadRequestException('Failed to create property')
		}

		if (!data) {
			this.logger.error('No data returned from insert')
			throw new BadRequestException(
				'Failed to create property - no data returned'
			)
		}

		this.cacheInvalidation.invalidatePropertyCaches(user_id, data.id)

		this.logger.log('Property created successfully', {
			property_id: data.id
		})
		return data as Property
	}

	async update(
		req: AuthenticatedRequest,
		property_id: string,
		request: UpdatePropertyDto,
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

		const updated_data: PropertyUpdate = {
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

		let query = client
			.from('properties')
			.update(updated_data)
			.eq('id', property_id)

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
		this.cacheInvalidation.invalidatePropertyCaches(user_id, property_id)

		return data as Property
	}

	async findAllWithUnits(
		req: AuthenticatedRequest,
		query: { search: string | null; status?: string | null; limit: number; offset: number }
	): Promise<{
		data: Property[]
		total: number
		limit: number
		offset: number
	}> {
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

		// Filter by status: exclude soft-deleted ('inactive') by default
		if (query.status) {
			queryBuilder = queryBuilder.eq('status', query.status)
		} else {
			queryBuilder = queryBuilder.neq('status', 'inactive')
		}

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
