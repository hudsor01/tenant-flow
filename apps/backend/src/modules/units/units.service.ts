/**
 * Units Service - Supabase Functions Pattern Implementation
 *
 * - NO ABSTRACTIONS: Service delegates to Supabase Functions directly
 * - KISS: Simple, focused service methods
 * - DRY: Supabase Functions handles data access logic
 * - Production mirror: Matches controller interface exactly
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '@repo/shared/types/backend-domain'
import type { Unit, UnitStats } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildILikePattern,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Helper method to get property IDs for a user (via ownerId)
	 */
	private async getUserPropertyIds(userId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('ownerId', userId)
		return properties?.map(p => p.id) || []
	}

	/**
	 * Get all units for a user via direct Supabase query
	 */
	async findAll(
		userId: string,
		query: Record<string, unknown>
	): Promise<Unit[]> {
		try {
			if (!userId) {
				this.logger.warn('Find all units requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Finding all units via direct Supabase query', {
				userId,
				query
			})

			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) return []

			// Build query with filters
			let queryBuilder = client
				.from('unit')
				.select('*')
				.in('propertyId', propertyIds)

			// Apply filters if provided
			if (query.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', String(query.propertyId))
			}

			if (query.status) {
				const status = String(
					query.status
				).toUpperCase() as Database['public']['Enums']['UnitStatus']
				const allowedStatuses: Database['public']['Enums']['UnitStatus'][] = [
					'VACANT',
					'OCCUPIED',
					'MAINTENANCE',
					'RESERVED'
				]
				if (allowedStatuses.includes(status)) {
					queryBuilder = queryBuilder.eq('status', status)
				}
			}

			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					const pattern = buildILikePattern(sanitized)
					queryBuilder = queryBuilder.ilike('unitNumber', pattern)
				}
			}

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			// Apply sorting
			const sortBy = query.sortBy || 'createdAt'
			const sortOrder = query.sortOrder || 'desc'
			queryBuilder = queryBuilder.order(sortBy as string, {
				ascending: sortOrder === 'asc'
			})

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to fetch units from Supabase', {
					error: error.message,
					userId,
					query
				})
				throw new BadRequestException('Failed to fetch units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('Units service failed to find all units', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch units'
			)
		}
	}

	/**
	 * Get unit statistics via direct Supabase query
	 */
	async getStats(userId: string): Promise<UnitStats> {
		try {
			if (!userId) {
				this.logger.warn('Unit stats requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting unit stats via direct Supabase query', {
				userId
			})

			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) {
				return {
					total: 0,
					occupied: 0,
					vacant: 0,
					maintenance: 0,
					available: 0,
					occupancyRate: 0,
					averageRent: 0,
					totalPotentialRent: 0,
					totalActualRent: 0
				} as UnitStats
			}

			// Get total units count
			const { count: totalCount, error: countError } = await client
				.from('unit')
				.select('*', { count: 'exact', head: true })
				.in('propertyId', propertyIds)

			if (countError) {
				this.logger.error('Failed to get total unit count', {
					error: countError.message,
					userId
				})
				throw new BadRequestException('Failed to get unit statistics')
			}

			// Get units by status
			const { data: statusData, error: statusError } = await client
				.from('unit')
				.select('status, rent')
				.in('propertyId', propertyIds)

			if (statusError) {
				this.logger.error('Failed to get unit status data', {
					error: statusError.message,
					userId
				})
				throw new BadRequestException('Failed to get unit statistics')
			}

			// Calculate statistics
			type UnitStatusData = {
				status: Database['public']['Enums']['UnitStatus']
				rent: number
			}
			const occupiedCount = statusData.filter(
				(u: UnitStatusData) => u.status === 'OCCUPIED'
			).length
			const vacantCount = statusData.filter(
				(u: UnitStatusData) => u.status === 'VACANT'
			).length
			const maintenanceCount = statusData.filter(
				(u: UnitStatusData) => u.status === 'MAINTENANCE'
			).length

			const totalRent = statusData.reduce(
				(sum: number, unit: UnitStatusData) => sum + (unit.rent || 0),
				0
			)
			const averageRent =
				statusData.length > 0 ? totalRent / statusData.length : 0
			const occupancyRate =
				totalCount && totalCount > 0
					? Math.round((occupiedCount / totalCount) * 100)
					: 0

			return {
				total: totalCount || 0,
				occupied: occupiedCount,
				vacant: vacantCount,
				maintenance: maintenanceCount,
				available: vacantCount,
				occupancyRate,
				averageRent,
				totalPotentialRent: totalRent,
				totalActualRent: occupiedCount * averageRent
			} as UnitStats
		} catch (error) {
			this.logger.error('Units service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get unit statistics'
			)
		}
	}

	/**
	 * Get units by property via direct Supabase query
	 */
	async findByProperty(userId: string, propertyId: string): Promise<Unit[]> {
		try {
			if (!userId || !propertyId) {
				this.logger.warn('Find by property called with missing parameters', {
					userId,
					propertyId
				})
				throw new BadRequestException('User ID and property ID are required')
			}

			this.logger.log('Finding units by property via direct Supabase query', {
				userId,
				propertyId
			})

			const client = this.supabase.getAdminClient()

			// Verify property ownership
			const { data: property } = await client
				.from('property')
				.select('id')
				.eq('id', propertyId)
				.eq('ownerId', userId)
				.single()

			if (!property) {
				this.logger.warn('Property not found or access denied', {
					userId,
					propertyId
				})
				return []
			}

			const { data, error } = await client
				.from('unit')
				.select('*')
				.eq('propertyId', propertyId)
				.order('unitNumber', { ascending: true })

			if (error) {
				this.logger.error('Failed to fetch units by property from Supabase', {
					error: error.message,
					userId,
					propertyId
				})
				throw new BadRequestException('Failed to retrieve property units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('Units service failed to find units by property', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				propertyId
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to retrieve property units'
			)
		}
	}

	/**
	 * Find one unit by ID via direct Supabase query
	 */
	async findOne(userId: string, unitId: string): Promise<Unit | null> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Find one unit called with missing parameters', {
					userId,
					unitId
				})
				return null
			}

			this.logger.log('Finding one unit via direct Supabase query', {
				userId,
				unitId
			})

			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) return null

			const { data, error } = await client
				.from('unit')
				.select('*')
				.eq('id', unitId)
				.in('propertyId', propertyIds)
				.single()

			if (error) {
				this.logger.error('Failed to fetch unit from Supabase', {
					error: error.message,
					userId,
					unitId
				})
				return null
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to find one unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId
			})
			return null
		}
	}

	/**
	 * Create unit via direct Supabase query
	 */
	async create(
		userId: string,
		createRequest: CreateUnitRequest
	): Promise<Unit> {
		try {
			if (!userId || !createRequest.propertyId || !createRequest.unitNumber) {
				this.logger.warn('Create unit called with missing parameters', {
					userId,
					createRequest
				})
				throw new BadRequestException(
					'User ID, property ID, and unit number are required'
				)
			}

			this.logger.log('Creating unit via direct Supabase query', {
				userId,
				createRequest
			})

			const client = this.supabase.getAdminClient()

			// Verify property ownership
			const { data: property } = await client
				.from('property')
				.select('id')
				.eq('id', createRequest.propertyId)
				.eq('ownerId', userId)
				.single()

			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}

			const unitData = {
				propertyId: createRequest.propertyId,
				unitNumber: createRequest.unitNumber,
				bedrooms: createRequest.bedrooms || 1,
				bathrooms: createRequest.bathrooms || 1,
				squareFeet: createRequest.squareFeet || null,
				rent: createRequest.rent || createRequest.rentAmount || 0,
				status: 'VACANT' as const
			}

			const { data, error } = await client
				.from('unit')
				.insert(unitData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create unit in Supabase', {
					error: error.message,
					userId,
					createRequest
				})
				throw new BadRequestException('Failed to create unit')
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to create unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				createRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create unit'
			)
		}
	}

	/**
	 * Update unit via direct Supabase query
	 */
	async update(
		userId: string,
		unitId: string,
		updateRequest: UpdateUnitRequest
	): Promise<Unit | null> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Update unit called with missing parameters', {
					userId,
					unitId
				})
				return null
			}

			this.logger.log('Updating unit via direct Supabase query', {
				userId,
				unitId,
				updateRequest
			})

			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) return null

			const updateData = {
				...(updateRequest.bedrooms !== undefined && {
					bedrooms: updateRequest.bedrooms
				}),
				...(updateRequest.bathrooms !== undefined && {
					bathrooms: updateRequest.bathrooms
				}),
				...(updateRequest.squareFeet !== undefined && {
					squareFeet: updateRequest.squareFeet
				}),
				...(updateRequest.rent !== undefined && { rent: updateRequest.rent }),
				...(updateRequest.status !== undefined && {
					status: updateRequest.status
				}),
				...(updateRequest.unitNumber !== undefined && {
					unitNumber: updateRequest.unitNumber
				}),
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await client
				.from('unit')
				.update(updateData)
				.eq('id', unitId)
				.in('propertyId', propertyIds)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update unit in Supabase', {
					error: error.message,
					userId,
					unitId,
					updateRequest
				})
				return null
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to update unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId,
				updateRequest
			})
			return null
		}
	}

	/**
	 * Remove unit via direct Supabase query
	 */
	async remove(userId: string, unitId: string): Promise<void> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Remove unit called with missing parameters', {
					userId,
					unitId
				})
				throw new BadRequestException('User ID and unit ID are required')
			}

			this.logger.log('Removing unit via direct Supabase query', {
				userId,
				unitId
			})

			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) {
				throw new BadRequestException('No properties found for user')
			}

			// Soft delete by deleting the record directly
			const { error } = await client
				.from('unit')
				.delete()
				.eq('id', unitId)
				.in('propertyId', propertyIds)

			if (error) {
				this.logger.error('Failed to remove unit in Supabase', {
					error: error.message,
					userId,
					unitId
				})
				throw new BadRequestException('Failed to remove unit')
			}
		} catch (error) {
			this.logger.error('Units service failed to remove unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove unit'
			)
		}
	}

	/**
	 * Get units analytics via direct Supabase query
	 */
	async getAnalytics(
		userId: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<Unit[]> {
		try {
			if (!userId) {
				this.logger.warn('Unit analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting unit analytics via direct Supabase query', {
				userId,
				options
			})

			// Simple query to get units for analytics
			const client = this.supabase.getAdminClient()
			const propertyIds = await this.getUserPropertyIds(userId)
			if (propertyIds.length === 0) return []

			let queryBuilder = client
				.from('unit')
				.select('*')
				.in('propertyId', propertyIds)

			if (options.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', options.propertyId)
			}

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to get unit analytics', {
					error: error.message,
					userId,
					options
				})
				return []
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('Units service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			return []
		}
	}

	/**
	 * Get available units for a property via Supabase Functions
	 */
	async getAvailable(propertyId: string): Promise<Unit[]> {
		try {
			if (!propertyId) {
				this.logger.warn('Available units requested without propertyId')
				throw new BadRequestException('Property ID is required')
			}

			this.logger.log('Getting available units via Supabase Functions', {
				propertyId
			})

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('unit')
				.select('*')
				.eq('propertyId', propertyId)
				.eq('status', 'VACANT')

			if (error) {
				this.logger.error('Failed to get available units from Supabase', {
					error: error.message,
					propertyId
				})
				throw new BadRequestException('Failed to get available units')
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('Units service failed to get available units', {
				error: error instanceof Error ? error.message : String(error),
				propertyId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get available units'
			)
		}
	}

	/**
	 * Update unit status via Supabase RPC function
	 */
	async updateStatus(
		userId: string,
		unitId: string,
		status: Database['public']['Enums']['UnitStatus']
	): Promise<Unit | null> {
		try {
			if (!userId || !unitId || !status) {
				this.logger.warn('Update unit status called with missing parameters', {
					userId,
					unitId,
					status
				})
				return null
			}

			this.logger.log('Updating unit status via direct Supabase query', {
				userId,
				unitId,
				status
			})

			// Update the unit status directly
			return this.update(userId, unitId, { status })
		} catch (error) {
			this.logger.error('Units service failed to update unit status', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId,
				status
			})
			return null
		}
	}

	/**
	 * Get unit statistics - replaces get_unit_statistics function
	 * Uses Supabase Functions pattern instead of database function
	 */
	async getUnitStatistics(
		userId: string,
		propertyId?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting unit statistics via direct Supabase query', {
				userId,
				propertyId
			})

			// Get unit stats and analytics directly
			const [stats, analytics] = await Promise.all([
				this.getStats(userId),
				this.getAnalytics(userId, {
					...(propertyId ? { propertyId } : {}),
					timeframe: '12m'
				})
			])

			// Calculate additional statistics from analytics data
			const totalUnits = analytics.length
			const occupiedUnits = analytics.filter(
				(unit: Unit) => unit.status === 'OCCUPIED'
			).length
			const vacantUnits = analytics.filter(
				(unit: Unit) => unit.status === 'VACANT'
			).length
			const maintenanceUnits = analytics.filter(
				(unit: Unit) => unit.status === 'MAINTENANCE'
			).length

			// Calculate average rent
			const totalRent = analytics.reduce((sum: number, unit: Unit) => {
				return sum + (unit.rent || 0)
			}, 0)
			const averageRent = totalUnits > 0 ? totalRent / totalUnits : 0

			// Calculate occupancy rate
			const occupancyRate =
				totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

			return {
				summary: {
					total: stats.total,
					occupied: stats.occupied,
					vacant: stats.vacant,
					maintenance: stats.maintenance || maintenanceUnits,
					occupancyRate: stats.occupancyRate,
					averageRent: stats.averageRent || averageRent
				},
				breakdown: {
					byStatus: {
						occupied: occupiedUnits,
						vacant: vacantUnits,
						maintenance: maintenanceUnits,
						available: stats.available || vacantUnits
					},
					byProperty: propertyId
						? {
								propertyId,
								totalUnits,
								occupiedUnits,
								vacantUnits,
								occupancyRate
							}
						: null
				},
				financial: {
					totalPotentialRent: stats.totalPotentialRent || totalRent,
					totalActualRent: stats.totalActualRent || occupiedUnits * averageRent,
					averageRent,
					totalRent
				},
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Failed to get unit statistics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				propertyId
			})
			return {}
		}
	}
}
