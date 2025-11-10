/**
 * Units Service - Supabase Functions Pattern Implementation
 *
 * - NO ABSTRACTIONS: Service delegates to Supabase Functions directly
 * - KISS: Simple, focused service methods
 * - DRY: Supabase Functions handles data access logic
 * - Production mirror: Matches controller interface exactly
 */

import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger
} from '@nestjs/common'
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

/**
 * Safe column list for unit queries
 * PERFORMANCE: Explicit column list prevents over-fetching
 */
const SAFE_UNIT_COLUMNS = `
	id,
	propertyId,
	unitNumber,
	bedrooms,
	bathrooms,
	squareFeet,
	rent,
	status,
	lastInspectionDate,
	createdAt,
	updatedAt,
	version
`.trim()

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * ❌ REMOVED: Manual property filtering violates RLS pattern
	 * RLS policies automatically filter data to user's scope via getUserClient(token)
	 */

	/**
	 * Get all units for a user via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async findAll(
		token: string,
		query: Record<string, unknown>
	): Promise<Unit[]> {
		try {
			if (!token) {
				this.logger.warn('Find all units requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Finding all units via RLS-protected query', { query })

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// Build query with filters (NO manual userId/propertyId filtering needed)
			let queryBuilder = client.from('unit').select(SAFE_UNIT_COLUMNS)

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
					query
				})
				throw new BadRequestException('Failed to fetch units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('Units service failed to find all units', {
				error: error instanceof Error ? error.message : String(error),
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch units'
			)
		}
	}

	/**
	 * Get unit statistics via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async getStats(token: string): Promise<UnitStats> {
		try {
			if (!token) {
				this.logger.warn('Unit stats requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit stats via RLS-protected query')

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// Get total units count (RLS automatically scopes to user's units)
			const { count: totalCount, error: countError } = await client
				.from('unit')
				.select('*', { count: 'exact', head: true })

			if (countError) {
				this.logger.error('Failed to get total unit count', {
					error: countError.message
				})
				throw new BadRequestException('Failed to get unit statistics')
			}

			// Get units by status (RLS automatically scopes to user's units)
			const { data: statusData, error: statusError } = await client
				.from('unit')
				.select('status, rent')

			if (statusError) {
				this.logger.error('Failed to get unit status data', {
					error: statusError.message
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
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get unit statistics'
			)
		}
	}

	/**
	 * Get units by property via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's properties
	 */
	async findByProperty(token: string, propertyId: string): Promise<Unit[]> {
		try {
			if (!token || !propertyId) {
				this.logger.warn('Find by property called with missing parameters', {
					propertyId
				})
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Finding units by property via RLS-protected query', {
				propertyId
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies property ownership - no manual check needed
			const { data, error } = await client
				.from('unit')
				.select(SAFE_UNIT_COLUMNS)
				.eq('propertyId', propertyId)
				.order('unitNumber', { ascending: true })

			if (error) {
				this.logger.error('Failed to fetch units by property from Supabase', {
					error: error.message,
					propertyId
				})
				throw new BadRequestException('Failed to retrieve property units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('Units service failed to find units by property', {
				error: error instanceof Error ? error.message : String(error),
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
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async findOne(token: string, unitId: string): Promise<Unit | null> {
		try {
			if (!token || !unitId) {
				this.logger.warn('Find one unit called with missing parameters', {
					unitId
				})
				return null
			}

			this.logger.log('Finding one unit via RLS-protected query', { unitId })

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies unit belongs to user's property
			const { data, error } = await client
				.from('unit')
				.select(SAFE_UNIT_COLUMNS)
				.eq('id', unitId)
				.single()

			if (error) {
				this.logger.error('Failed to fetch unit from Supabase', {
					error: error.message,
					unitId
				})
				return null
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to find one unit', {
				error: error instanceof Error ? error.message : String(error),
				unitId
			})
			return null
		}
	}

	/**
	 * Create unit via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies property ownership
	 */
	async create(token: string, createRequest: CreateUnitRequest): Promise<Unit> {
		try {
			if (!token || !createRequest.propertyId || !createRequest.unitNumber) {
				this.logger.warn('Create unit called with missing parameters', {
					createRequest
				})
				throw new BadRequestException(
					'Authentication token, property ID, and unit number are required'
				)
			}

			this.logger.log('Creating unit via RLS-protected query', {
				createRequest
			})

			// ✅ RLS SECURITY: User-scoped client automatically verifies property ownership
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies property ownership - no manual check needed
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
					createRequest
				})
				throw new BadRequestException('Failed to create unit')
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to create unit', {
				error: error instanceof Error ? error.message : String(error),
				createRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create unit'
			)
		}
	}

	/**
	 * Update unit via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit ownership
	 */
	async update(
		token: string,
		unitId: string,
		updateRequest: UpdateUnitRequest,
		expectedVersion?: number //Optimistic locking
	): Promise<Unit | null> {
		try {
			if (!token || !unitId) {
				this.logger.warn('Update unit called with missing parameters', {
					unitId
				})
				return null
			}

			this.logger.log('Updating unit via RLS-protected query', {
				unitId,
				updateRequest
			})

			// ✅ RLS SECURITY: User-scoped client automatically verifies unit ownership
			const client = this.supabase.getUserClient(token)

			const updateData: Record<string, unknown> = {
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

			//Increment version for optimistic locking
			if (expectedVersion !== undefined) {
				updateData.version = expectedVersion + 1
			}

			//Add version check for optimistic locking
			// RLS automatically verifies unit ownership - no manual propertyId check needed
			let query = client.from('unit').update(updateData).eq('id', unitId)

			if (expectedVersion !== undefined) {
				query = query.eq('version', expectedVersion)
			}

			const { data, error } = await query.select().single()

			if (error || !data) {
				//Detect optimistic locking conflict
				if (error?.code === 'PGRST116' || !data) {
					this.logger.warn('Optimistic locking conflict detected', {
						unitId,
						expectedVersion
					})
					throw new ConflictException(
						'Unit was modified by another user. Please refresh and try again.'
					)
				}

				// If we get here, there was a different error
				this.logger.error('Failed to update unit in Supabase', {
					error: error,
					unitId,
					updateRequest
				})
				return null
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to update unit', {
				error: error instanceof Error ? error.message : String(error),
				unitId,
				updateRequest
			})
			return null
		}
	}

	/**
	 * Remove unit via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit ownership
	 */
	async remove(token: string, unitId: string): Promise<void> {
		try {
			if (!token || !unitId) {
				this.logger.warn('Remove unit called with missing parameters', {
					unitId
				})
				throw new BadRequestException(
					'Authentication token and unit ID are required'
				)
			}

			this.logger.log('Removing unit via RLS-protected query', { unitId })

			// ✅ RLS SECURITY: User-scoped client automatically verifies unit ownership
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies unit ownership - no manual propertyId check needed
			const { error } = await client.from('unit').delete().eq('id', unitId)

			if (error) {
				this.logger.error('Failed to remove unit in Supabase', {
					error: error.message,
					unitId
				})
				throw new BadRequestException('Failed to remove unit')
			}
		} catch (error) {
			this.logger.error('Units service failed to remove unit', {
				error: error instanceof Error ? error.message : String(error),
				unitId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove unit'
			)
		}
	}

	/**
	 * Get units analytics via direct Supabase query
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async getAnalytics(
		token: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<Unit[]> {
		try {
			if (!token) {
				this.logger.warn('Unit analytics requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit analytics via RLS-protected query', {
				options
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			let queryBuilder = client.from('unit').select(SAFE_UNIT_COLUMNS)

			if (options.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', options.propertyId)
			}

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to get unit analytics', {
					error: error.message,
					options
				})
				return []
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('Units service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				options
			})
			return []
		}
	}

	/**
	 * Get available units for a property via Supabase Functions
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's properties
	 */
	async getAvailable(token: string, propertyId: string): Promise<Unit[]> {
		try {
			if (!token || !propertyId) {
				this.logger.warn(
					'Available units requested without token or propertyId'
				)
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Getting available units via RLS-protected query', {
				propertyId
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)
			const { data, error } = await client
				.from('unit')
				.select(SAFE_UNIT_COLUMNS)
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
	 * ✅ RLS COMPLIANT: Delegates to update() which uses getUserClient(token)
	 */
	async updateStatus(
		token: string,
		unitId: string,
		status: Database['public']['Enums']['UnitStatus']
	): Promise<Unit | null> {
		try {
			if (!token || !unitId || !status) {
				this.logger.warn('Update unit status called with missing parameters', {
					unitId,
					status
				})
				return null
			}

			this.logger.log('Updating unit status via RLS-protected query', {
				unitId,
				status
			})

			// Delegate to update() which uses RLS-protected client
			return this.update(token, unitId, { status })
		} catch (error) {
			this.logger.error('Units service failed to update unit status', {
				error: error instanceof Error ? error.message : String(error),
				unitId,
				status
			})
			return null
		}
	}

	/**
	 * Get unit statistics - replaces get_unit_statistics function
	 * Uses Supabase Functions pattern instead of database function
	 * ✅ RLS COMPLIANT: Delegates to getStats() and getAnalytics() which use getUserClient(token)
	 */
	async getUnitStatistics(
		token: string,
		propertyId?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting unit statistics via RLS-protected queries', {
				propertyId
			})

			// Get unit stats and analytics directly (both use RLS-protected clients)
			const [stats, analytics] = await Promise.all([
				this.getStats(token),
				this.getAnalytics(token, {
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
				propertyId
			})
			return {}
		}
	}
}
