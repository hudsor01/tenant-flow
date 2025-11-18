/**
 * Units Service - Supabase Functions Pattern Implementation

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
import type { Unit, UnitStats, UnitStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { ZeroCacheService } from '../../cache/cache.service'
import {
	buildILikePattern,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import type { CreateUnitDto } from './dto/create-unit.dto'
import type { UpdateUnitDto } from './dto/update-unit.dto'

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly cache: ZeroCacheService
	) {}

	/**
	 * REMOVED: Manual property filtering violates RLS pattern
	 * RLS policies automatically filter data to user's scope via getUserClient(token)
	 */

	/**
	 * Get all units for a user via direct Supabase query
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
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

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// Build query with filters (NO manual user_id/property_id filtering needed)
			let queryBuilder = client.from('units').select('*')

			// Apply filters if provided
			if (query.property_id) {
				queryBuilder = queryBuilder.eq('property_id', String(query.property_id))
			}

			if (query.status) {
				const statusInput = String(query.status).toUpperCase()
				const allowedStatuses: UnitStatus[] = [
					'VACANT',
					'OCCUPIED',
					'MAINTENANCE',
					'RESERVED'
				]
				const isValidStatus = allowedStatuses.includes(
					statusInput as UnitStatus
				)
				if (isValidStatus) {
					queryBuilder = queryBuilder.eq(
						'status',
						statusInput as UnitStatus
					)
				}
			}

			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					const pattern = buildILikePattern(sanitized)
					queryBuilder = queryBuilder.ilike('unit_number', pattern)
				}
			}

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			// Apply sorting
			const sortBy = query.sortBy || 'created_at'
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async getStats(token: string): Promise<UnitStats> {
		try {
			if (!token) {
				this.logger.warn('Unit stats requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit stats via RLS-protected query')

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// Get total units count (RLS automatically scopes to user's units)
			const { count: totalCount, error: countError } = await client
				.from('units')
				.select('*', { count: 'exact', head: true })

			if (countError) {
				this.logger.error('Failed to get total unit count', {
					error: countError.message
				})
				throw new BadRequestException('Failed to get unit statistics')
			}

			// Get units by status (RLS automatically scopes to user's units)
		type UnitStatusData = {
			status: UnitStatus
			rent_amount: number
		}
		const { data: statusDataRaw, error: statusError } = await client
			.from('units')
			.select('status, rent_amount')

		if (statusError) {
			this.logger.error('Failed to get unit status data', {
				error: statusError.message
			})
			throw new BadRequestException('Failed to get unit statistics')
		}

		// Calculate statistics
		const statusData = (statusDataRaw || []) as UnitStatusData[]
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
				(sum: number, unit: UnitStatusData) => sum + (unit.rent_amount || 0),
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's properties
	 */
	async findByProperty(token: string, property_id: string): Promise<Unit[]> {
		try {
			if (!token || !property_id) {
				this.logger.warn('Find by property called with missing parameters', {
					property_id
				})
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Finding units by property via RLS-protected query', {
				property_id
			})

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies property ownership - no manual check needed
			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('property_id', property_id)
				.order('unit_number', { ascending: true })

			if (error) {
				this.logger.error('Failed to fetch units by property from Supabase', {
					error: error.message,
					property_id
				})
				throw new BadRequestException('Failed to retrieve property units')
			}

			return data as Unit[]
		} catch (error) {
			this.logger.error('Units service failed to find units by property', {
				error: error instanceof Error ? error.message : String(error),
				property_id
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async findOne(token: string, unit_id: string): Promise<Unit | null> {
		try {
			if (!token || !unit_id) {
				this.logger.warn('Find one unit called with missing parameters', {
					unit_id
				})
				return null
			}

			this.logger.log('Finding one unit via RLS-protected query', { unit_id })

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// RLS automatically verifies unit belongs to user's property
			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('id', unit_id)
				.single()

			if (error) {
				this.logger.error('Failed to fetch unit from Supabase', {
					error: error.message,
					unit_id
				})
				return null
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Units service failed to find one unit', {
				error: error instanceof Error ? error.message : String(error),
				unit_id
			})
			return null
		}
	}

	/**
	 * Create unit via direct Supabase query
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies property ownership
	 */
	async create(token: string, createRequest: CreateUnitDto): Promise<Unit> {
		try {
			if (!token || !createRequest.property_id || !createRequest.unit_number) {
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

			// RLS SECURITY: User-scoped client automatically verifies property ownership
			const client = this.supabase.getUserClient(token)

		// RLS automatically verifies property ownership - no manual check needed
			const unitData = {
				property_id: createRequest.property_id,
				unit_number: createRequest.unit_number,
				bedrooms: createRequest.bedrooms || 1,
				bathrooms: createRequest.bathrooms || 1,
				square_feet: createRequest.square_feet || null,
				rent_amount: createRequest.rent ?? 0,
				status: createRequest.status ?? 'VACANT'
			}

			const { data, error } = await client
				.from('units')
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

			const createdUnit = data as Unit

			// Invalidate caches so downstream consumers (lease auto-fill, dashboards) get fresh data
			this.cache.invalidateByEntity('units', createdUnit.id)
			this.cache.invalidateByEntity('properties', createdUnit.property_id)

			return createdUnit
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit ownership
	 */
	async update(
		token: string,
		unit_id: string,
		updateRequest: UpdateUnitDto,
		expectedVersion?: number //Optimistic locking
	): Promise<Unit | null> {
		try {
			if (!token || !unit_id) {
				this.logger.warn('Update unit called with missing parameters', {
					unit_id
				})
				return null
			}

			this.logger.log('Updating unit via RLS-protected query', {
				unit_id,
				updateRequest
			})

			// RLS SECURITY: User-scoped client automatically verifies unit ownership
			const client = this.supabase.getUserClient(token)

			const updated_ata: Record<string, unknown> = {
				...(updateRequest.bedrooms !== undefined && {
					bedrooms: updateRequest.bedrooms
				}),
				...(updateRequest.bathrooms !== undefined && {
					bathrooms: updateRequest.bathrooms
				}),
				...(updateRequest.square_feet !== undefined && {
					square_feet: updateRequest.square_feet
				}),
				...(updateRequest.rent !== undefined && { rent_amount: updateRequest.rent }),
				...(updateRequest.status !== undefined && {
					status: updateRequest.status
				}),
				...(updateRequest.unit_number !== undefined && {
					unit_number: updateRequest.unit_number
				}),
				updated_at: new Date().toISOString()
			}

			//Increment version for optimistic locking
			if (expectedVersion !== undefined) {
				updated_ata.version = expectedVersion + 1
			}

			//Add version check for optimistic locking
			// RLS automatically verifies unit ownership - no manual property_id check needed
			let query = client.from('units').update(updated_ata).eq('id', unit_id)

			if (expectedVersion !== undefined) {
				query = query.eq('version', expectedVersion)
			}

			const { data, error } = await query.select().single()

			if (error || !data) {
				//Detect optimistic locking conflict
				if (error?.code === 'PGRST116' || !data) {
					this.logger.warn('Optimistic locking conflict detected', {
						unit_id,
						expectedVersion
					})
					throw new ConflictException(
						'Unit was modified by another user. Please refresh and try again.'
					)
				}

				// If we get here, there was a different error
				this.logger.error('Failed to update unit in Supabase', {
					error: error,
					unit_id,
					updateRequest
				})
				return null
			}

			const updatedUnit = data as Unit

			// Invalidate dependent caches so lease auto-fill returns fresh unit data
			this.cache.invalidateByEntity('units', unit_id)
			if (updatedUnit.property_id) {
				this.cache.invalidateByEntity('properties', updatedUnit.property_id)
			}

			return updatedUnit
		} catch (error) {
			this.logger.error('Units service failed to update unit', {
				error: error instanceof Error ? error.message : String(error),
				unit_id,
				updateRequest
			})
			return null
		}
	}

	/**
	 * Remove unit via direct Supabase query
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies unit ownership
	 */
	async remove(token: string, unit_id: string): Promise<void> {
		try {
			if (!token || !unit_id) {
				this.logger.warn('Remove unit called with missing parameters', {
					unit_id
				})
				throw new BadRequestException(
					'Authentication token and unit ID are required'
				)
			}

			this.logger.log('Removing unit via RLS-protected query', { unit_id })

			// RLS SECURITY: User-scoped client automatically verifies unit ownership
			const client = this.supabase.getUserClient(token)

			// Fetch unit metadata before deletion so we can invalidate property cache afterwards
			const { data: existingUnit, error: fetchError } = await client
				.from('units')
				.select('id, property_id')
				.eq('id', unit_id)
				.single()
			if (fetchError && fetchError.code !== 'PGRST116') {
				this.logger.warn('Failed to fetch unit metadata before deletion', {
					error: fetchError.message,
					unit_id
				})
			}

			// RLS automatically verifies unit ownership - no manual property_id check needed
			const { error } = await client.from('units').delete().eq('id', unit_id)

			if (error) {
				this.logger.error('Failed to remove unit in Supabase', {
					error: error.message,
					unit_id
				})
				throw new BadRequestException('Failed to remove unit')
			}

			// Invalidate caches tied to this unit/property so data disappears immediately
			this.cache.invalidateByEntity('units', unit_id)
			if (existingUnit?.property_id) {
				this.cache.invalidateByEntity('properties', existingUnit.property_id)
			}
		} catch (error) {
			this.logger.error('Units service failed to remove unit', {
				error: error instanceof Error ? error.message : String(error),
				unit_id
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove unit'
			)
		}
	}

	/**
	 * Get units analytics via direct Supabase query
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async getAnalytics(
		token: string,
		options: { property_id?: string; timeframe: string }
	): Promise<Unit[]> {
		try {
			if (!token) {
				this.logger.warn('Unit analytics requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit analytics via RLS-protected query', {
				options
			})

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			let queryBuilder = client.from('units').select('*')

			if (options.property_id) {
				queryBuilder = queryBuilder.eq('property_id', options.property_id)
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's properties
	 */
	async getAvailable(token: string, property_id: string): Promise<Unit[]> {
		try {
			if (!token || !property_id) {
				this.logger.warn(
					'Available units requested without token or property_id'
				)
				throw new BadRequestException(
					'Authentication token and property ID are required'
				)
			}

			this.logger.log('Getting available units via RLS-protected query', {
				property_id
			})

			// RLS SECURITY: User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)
			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('property_id', property_id)
				.eq('status', 'VACANT')

			if (error) {
				this.logger.error('Failed to get available units from Supabase', {
					error: error.message,
					property_id
				})
				throw new BadRequestException('Failed to get available units')
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('Units service failed to get available units', {
				error: error instanceof Error ? error.message : String(error),
				property_id
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get available units'
			)
		}
	}

	/**
	 * Update unit status via Supabase RPC function
	 * RLS COMPLIANT: Delegates to update() which uses getUserClient(token)
	 */
	async updateStatus(
		token: string,
		unit_id: string,
		status: UnitStatus
	): Promise<Unit | null> {
		try {
			if (!token || !unit_id || !status) {
				this.logger.warn('Update unit status called with missing parameters', {
					unit_id,
					status
				})
				return null
			}

			this.logger.log('Updating unit status via RLS-protected query', {
				unit_id,
				status
			})

			// Delegate to update() which uses RLS-protected client
			return this.update(token, unit_id, { status })
		} catch (error) {
			this.logger.error('Units service failed to update unit status', {
				error: error instanceof Error ? error.message : String(error),
				unit_id,
				status
			})
			return null
		}
	}

	/**
	 * Get unit statistics - replaces get_unit_statistics function
	 * Uses Supabase Functions pattern instead of database function
	 * RLS COMPLIANT: Delegates to getStats() and getAnalytics() which use getUserClient(token)
	 */
	async getUnitStatistics(
		token: string,
		property_id?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting unit statistics via RLS-protected queries', {
				property_id
			})

			// Get unit stats and analytics directly (both use RLS-protected clients)
			const [stats, analytics] = await Promise.all([
				this.getStats(token),
				this.getAnalytics(token, {
					...(property_id ? { property_id } : {}),
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
				return sum + (unit.rent_amount || 0)
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
					byProperty: property_id
						? {
								property_id,
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
				property_id
			})
			return {}
		}
	}
}
