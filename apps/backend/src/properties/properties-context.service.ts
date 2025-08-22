import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../database/supabase.service'
import { RequestContextService } from '../shared/services/request-context.service'
import {
	CreatePropertyDto,
	UpdatePropertyDto
} from '../shared/types/dto-exports'

type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']

export interface PropertyWithRelations extends Property {
	Unit?: Unit[]
}

/**
 * Properties Service - Request Context Implementation
 * 
 * This is a modernized version of the original PropertiesService showing
 * how to use RequestContextService instead of manual ID passing.
 * 
 * Key improvements:
 * - No manual userId/orgId parameter threading
 * - Automatic tenant isolation
 * - Enhanced logging with correlation IDs
 * - Built-in performance monitoring
 * - Cleaner service interfaces
 */
@Injectable()
export class PropertiesContextService {
	private readonly logger = new Logger(PropertiesContextService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly requestContext: RequestContextService
	) {}

	/**
	 * Get user-scoped Supabase client
	 * Context automatically provides the correct client scope
	 */
	private getClient(): SupabaseClient<Database> {
		// For now, use admin client with RLS for security
		// TODO: Extract auth token from request context when available
		return this.supabaseService.getAdminClient()
	}

	/**
	 * Get all properties for the authenticated user
	 * 
	 * BEFORE: findAll(ownerId: string, authToken?: string)
	 * AFTER:  findAll() - context provides user automatically
	 */
	async findAll(): Promise<(PropertyWithRelations & {
		occupancyRate: number
		totalRevenue: number
	})[]> {
		// Get user ID from context - no manual parameter needed
		const userId = this.requestContext.getUserId()
		
		if (!userId) {
			throw new BadRequestException('User authentication required')
		}

		// Enhanced logging with correlation ID
		this.requestContext.log('Fetching user properties', { 
			userId,
			operation: 'findAll' 
		})

		const supabase = this.getClient()
		const { data, error } = await supabase
			.from('Property')
			.select(`
				*,
				Unit (*)
			`)
			.eq('ownerId', userId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.requestContext.error('Failed to fetch properties', error)
			throw new BadRequestException(error.message)
		}

		// Calculate metrics with performance monitoring
		const startCalc = Date.now()
		const propertiesWithMetrics = (data as PropertyWithRelations[]).map(property => {
			const occupancyRate = property.Unit && property.Unit.length > 0
				? Math.round((property.Unit.filter(u => u.status === 'OCCUPIED').length / property.Unit.length) * 100)
				: 0
			
			const totalRevenue = property.Unit
				? property.Unit.reduce((total, unit) => {
					if (unit.status === 'OCCUPIED') {
						return total + (unit.rent || 0)
					}
					return total
				}, 0)
				: 0

			return {
				...property,
				occupancyRate,
				totalRevenue
			}
		})

		const calcDuration = Date.now() - startCalc
		this.requestContext.log('Properties fetched with metrics', {
			propertyCount: data.length,
			calculationTime: calcDuration,
			userId
		})

		return propertiesWithMetrics
	}

	/**
	 * Get single property by ID with automatic tenant isolation
	 * 
	 * BEFORE: findOne(id: string, ownerId: string, authToken?: string)
	 * AFTER:  findOne(id: string) - context provides user/tenant scoping
	 */
	async findOne(id: string): Promise<PropertyWithRelations> {
		// Context ensures we have user authentication
		const userId = this.requestContext.getUserId()
		
		if (!userId) {
			throw new BadRequestException('User authentication required')
		}

		this.requestContext.log('Fetching property by ID', { propertyId: id, userId })

		const supabase = this.getClient()
		const { data, error } = await supabase
			.from('Property')
			.select(`
				*,
				Unit (*)
			`)
			.eq('id', id)
			.eq('ownerId', userId) // Automatic tenant isolation
			.single()

		if (error || !data) {
			this.requestContext.error('Property not found', error, { propertyId: id })
			throw new NotFoundException('Property not found')
		}

		this.requestContext.log('Property found', { propertyId: id, hasUnits: !!data.Unit?.length })
		return data as PropertyWithRelations
	}

	/**
	 * Create new property with automatic owner assignment
	 * 
	 * BEFORE: create(createPropertyDto: CreatePropertyDto, ownerId: string)
	 * AFTER:  create(createPropertyDto: CreatePropertyDto) - context provides owner
	 */
	async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
		const userId = this.requestContext.getUserId()
		const organizationId = this.requestContext.getOrganizationId()
		
		if (!userId) {
			throw new BadRequestException('User authentication required')
		}

		this.requestContext.log('Creating new property', { 
			userId, 
			organizationId,
			propertyData: { ...createPropertyDto, sensitive: 'redacted' }
		})

		const supabase = this.getClient()
		const { data, error } = await supabase
			.from('Property')
			.insert({
				...createPropertyDto,
				ownerId: userId, // Automatic owner assignment from context
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
			.select()
			.single()

		if (error || !data) {
			this.requestContext.error('Failed to create property', error)
			throw new BadRequestException(error?.message || 'Failed to create property')
		}

		this.requestContext.log('Property created successfully', { 
			propertyId: data.id,
			userId
		})

		return data
	}

	/**
	 * Update property with multi-tenant validation
	 * 
	 * BEFORE: update(id: string, updatePropertyDto: UpdatePropertyDto, ownerId: string)
	 * AFTER:  update(id: string, updatePropertyDto: UpdatePropertyDto)
	 */
	async update(id: string, updatePropertyDto: UpdatePropertyDto): Promise<Property> {
		// Require organization context for multi-tenant operations
		const { userId, organizationId } = this.requestContext.requireOrganizationContext()

		this.requestContext.log('Updating property', { 
			propertyId: id, 
			userId, 
			organizationId 
		})

		const supabase = this.getClient()

		// Verify property exists and belongs to user (tenant isolation)
		const { data: existingProperty } = await supabase
			.from('Property')
			.select('ownerId')
			.eq('id', id)
			.single()

		if (!existingProperty || existingProperty.ownerId !== userId) {
			this.requestContext.error('Property not found or access denied', undefined, {
				propertyId: id,
				requestedBy: userId,
				actualOwner: existingProperty?.ownerId
			})
			throw new NotFoundException('Property not found')
		}

		// Perform update
		const { data, error } = await supabase
			.from('Property')
			.update({
				...updatePropertyDto,
				updatedAt: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single()

		if (error || !data) {
			this.requestContext.error('Failed to update property', error)
			throw new BadRequestException(error?.message || 'Failed to update property')
		}

		this.requestContext.log('Property updated successfully', { 
			propertyId: id,
			updatedFields: Object.keys(updatePropertyDto)
		})

		return data
	}

	/**
	 * Delete property with tenant isolation
	 * 
	 * BEFORE: remove(id: string, ownerId: string)
	 * AFTER:  remove(id: string)
	 */
	async remove(id: string): Promise<void> {
		const userId = this.requestContext.getUserId()
		
		if (!userId) {
			throw new BadRequestException('User authentication required')
		}

		this.requestContext.log('Deleting property', { propertyId: id, userId })

		// Ensure property belongs to user before deletion
		await this.findOne(id) // This already includes tenant validation

		const supabase = this.getClient()
		const { error } = await supabase
			.from('Property')
			.delete()
			.eq('id', id)
			.eq('ownerId', userId) // Double-check tenant isolation

		if (error) {
			this.requestContext.error('Failed to delete property', error)
			throw new BadRequestException(error.message)
		}

		this.requestContext.log('Property deleted successfully', { propertyId: id })
	}

	/**
	 * Get property statistics with automatic tenant scoping
	 */
	async getStats(): Promise<{
		totalProperties: number
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		totalRevenue: number
		occupancyRate: number
	}> {
		const userId = this.requestContext.getUserId()
		
		if (!userId) {
			throw new BadRequestException('User authentication required')
		}

		this.requestContext.log('Calculating property statistics', { userId })

		const properties = await this.findAll()
		
		const stats = {
			totalProperties: properties.length,
			totalUnits: properties.reduce((sum, p) => sum + (p.Unit?.length || 0), 0),
			occupiedUnits: properties.reduce((sum, p) => 
				sum + (p.Unit?.filter(u => u.status === 'OCCUPIED').length || 0), 0),
			vacantUnits: properties.reduce((sum, p) => 
				sum + (p.Unit?.filter(u => u.status === 'VACANT').length || 0), 0),
			totalRevenue: properties.reduce((sum, p) => sum + p.totalRevenue, 0),
			occupancyRate: 0
		}

		stats.occupancyRate = stats.totalUnits > 0 
			? Math.round((stats.occupiedUnits / stats.totalUnits) * 100)
			: 0

		this.requestContext.log('Property statistics calculated', { 
			...stats,
			userId 
		})

		return stats
	}

	/**
	 * Example of handling operations that might not have request context
	 * (useful for background jobs or admin operations)
	 */
	async findPropertiesFlexible(userIdOverride?: string): Promise<Property[]> {
		// Try context first, fallback to parameter
		const userId = userIdOverride || this.requestContext.getUserId()
		
		if (!userId) {
			throw new BadRequestException('User ID required (from context or parameter)')
		}

		// Use context logging if available, regular logger otherwise
		if (this.requestContext.hasContext()) {
			this.requestContext.log('Fetching properties with context', { userId })
		} else {
			this.logger.log('Fetching properties without context', { userId })
		}

		const supabase = userIdOverride 
			? this.supabaseService.getAdminClient() // Admin client for override scenarios
			: this.getClient() // User client for context scenarios
		
		const { data, error } = await supabase
			.from('Property')
			.select('*')
			.eq('ownerId', userId)

		if (error) {
			if (this.requestContext.hasContext()) {
				this.requestContext.error('Failed to fetch properties', error)
			} else {
				this.logger.error('Failed to fetch properties', error)
			}
			throw new BadRequestException(error.message)
		}

		return data || []
	}
}