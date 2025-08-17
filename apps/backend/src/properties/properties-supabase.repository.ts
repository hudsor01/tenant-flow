import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type PropertyRow = Database['public']['Tables']['Property']['Row']
type PropertyInsert = Database['public']['Tables']['Property']['Insert']
type PropertyUpdate = Database['public']['Tables']['Property']['Update']

export interface PropertyWithRelations extends PropertyRow {
	Unit?: {
		id: string
		unitNumber: string
		status: string
		rent: number
	}[]
	_count?: {
		Unit: number
	}
}

export interface PropertyQueryOptions {
	propertyType?: string
	search?: string
	status?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Property entity
 * Replaces the Prisma-based PropertiesRepository
 */
@Injectable()
export class PropertiesSupabaseRepository extends BaseSupabaseRepository<
	'Property',
	PropertyRow,
	PropertyInsert,
	PropertyUpdate
> {
	protected readonly tableName = 'Property' as const

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find properties by owner with units included
	 */
	async findByOwnerWithUnits(
		ownerId: string,
		options: PropertyQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const {
				propertyType,
				search,
				limit = 10,
				offset = 0,
				page
			} = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query
			let query = client
				.from('Property')
				.select(
					`
					*,
					Unit (
						id,
						unitNumber,
						status,
						rent
					)
				`
				)
				.eq('ownerId', ownerId)

			// Add property type filter
			if (propertyType) {
				query = query.eq(
					'propertyType',
					propertyType as NonNullable<PropertyRow['propertyType']>
				)
			}

			// Add search filter (searches in name, address, and city)
			if (search) {
				query = query.or(
					`name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`
				)
			}

			// Apply pagination
			query = query.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Error fetching properties with units:',
					error
				)
				throw error
			}

			// Transform data to match expected format
			const properties = (data || []).map(property => ({
				...property,
				_count: {
					Unit: property.Unit?.length || 0
				}
			})) as PropertyWithRelations[]

			return properties
		} catch (error) {
			this.logger.error('Failed to fetch properties by owner:', error)
			throw error
		}
	}

	/**
	 * Find all properties with units for an owner
	 */
	async findAllWithUnits(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)

			const { data, error } = await client
				.from('Property')
				.select(
					`
					*,
					Unit (
						id,
						unitNumber,
						status,
						rent
					)
				`
				)
				.eq('ownerId', ownerId)
				.order('createdAt', { ascending: false })

			if (error) {
				this.logger.error(
					'Error fetching all properties with units:',
					error
				)
				throw error
			}

			// Transform data to match expected format
			const properties = (data || []).map(property => ({
				...property,
				_count: {
					Unit: property.Unit?.length || 0
				}
			})) as PropertyWithRelations[]

			return properties
		} catch (error) {
			this.logger.error(
				'Failed to fetch all properties with units:',
				error
			)
			throw error
		}
	}

	/**
	 * Get property statistics for an owner
	 */
	async getPropertyStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		byType: Record<string, number>
		totalUnits: number
		occupiedUnits: number
	}> {
		try {
			const client = await this.getClient(userId, userToken)

			// Get all properties with units for the owner
			const { data: properties, error } = await client
				.from('Property')
				.select(
					`
					propertyType,
					Unit (
						status
					)
				`
				)
				.eq('ownerId', ownerId)

			if (error) {
				this.logger.error('Error fetching property stats:', error)
				throw error
			}

			// Calculate statistics
			const stats = {
				total: properties?.length || 0,
				byType: {} as Record<string, number>,
				totalUnits: 0,
				occupiedUnits: 0
			}

			if (properties) {
				for (const property of properties) {
					// Count by property type
					const type = property.propertyType || 'UNKNOWN'
					stats.byType[type] = (stats.byType[type] || 0) + 1

					// Count units
					if (property.Unit) {
						stats.totalUnits += property.Unit.length
						stats.occupiedUnits += property.Unit.filter(
							(unit: { status: string }) =>
								unit.status === 'OCCUPIED'
						).length
					}
				}
			}

			return stats
		} catch (error) {
			this.logger.error('Failed to get property stats:', error)
			throw error
		}
	}

	/**
	 * Create a property with initial units
	 */
	async createWithUnits(
		propertyData: PropertyInsert,
		unitData?: Database['public']['Tables']['Unit']['Insert'][],
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// Create property first
			const { data: property, error: propertyError } = await client
				.from('Property')
				.insert(propertyData)
				.select('*')
				.single()

			if (propertyError || !property) {
				this.logger.error('Error creating property:', propertyError)
				throw propertyError || new Error('Failed to create property')
			}

			// Create units if provided
			let units: {
				id: string
				unitNumber: string
				status: string
				rent: number
			}[] = []
			if (unitData && unitData.length > 0) {
				const unitsWithPropertyId = unitData.map(unit => ({
					...unit,
					propertyId: property.id
				}))

				const { data: createdUnits, error: unitsError } = await client
					.from('Unit')
					.insert(unitsWithPropertyId)
					.select('id, unitNumber, status, rent')

				if (unitsError) {
					this.logger.error('Error creating units:', unitsError)
					// Don't throw here - property was created successfully
					// Log the error but return the property
				} else {
					units = createdUnits || []
				}
			}

			return {
				...property,
				Unit: units,
				_count: {
					Unit: units.length
				}
			} as PropertyWithRelations
		} catch (error) {
			this.logger.error('Failed to create property with units:', error)
			throw error
		}
	}

	/**
	 * Delete property and all related units
	 */
	async deleteWithUnits(
		propertyId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			const client = await this.getClient(userId, userToken)

			// Delete units first (due to foreign key constraint)
			const { error: unitsError } = await client
				.from('Unit')
				.delete()
				.eq('propertyId', propertyId)

			if (unitsError) {
				this.logger.error('Error deleting units:', unitsError)
				throw unitsError
			}

			// Delete property
			const { error: propertyError } = await client
				.from('Property')
				.delete()
				.eq('id', propertyId)

			if (propertyError) {
				this.logger.error('Error deleting property:', propertyError)
				throw propertyError
			}

			this.logger.debug(`Deleted property ${propertyId} with all units`)
		} catch (error) {
			this.logger.error('Failed to delete property with units:', error)
			throw error
		}
	}
}
