/**
 * Unit Query Service
 * Handles all unit query operations: findAll with filtering, by property, available units, status updates
 * Extracted from UnitsService to maintain <300 line limit per CLAUDE.md
 *
 * @todo TEST-001: Add unit tests for this service.
 *       Coverage: findAll, findByProperty, findAvailable, updateStatus.
 *       See TODO.md for details.
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type { Unit, UnitStatus } from '@repo/shared/types/core'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import {
	buildILikePattern,
	sanitizeSearchInput
} from '../../../shared/utils/sql-safe.utils'
import { VALID_UNIT_STATUSES } from '../../../schemas/units.schema'

@Injectable()
export class UnitQueryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get all units for a user via direct Supabase query
	 * Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async findAll(
		token: string,
		query: {
			property_id?: string | null | undefined
			status?: string | null | undefined
			search?: string | null | undefined
			limit?: number | undefined
			offset?: number | undefined
			sortBy?: string | undefined
			sortOrder?: string | undefined
		}
	): Promise<Unit[]> {
		try {
			if (!token) {
				this.logger.warn('Find all units requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Finding all units via RLS-protected query', { query })

			// User-scoped client automatically filters to user's properties
			const client = this.supabase.getUserClient(token)

			// Build query with filters (NO manual user_id/property_id filtering needed)
			let queryBuilder = client.from('units').select('*')

			// Apply filters if provided
			if (query.property_id) {
				queryBuilder = queryBuilder.eq('property_id', String(query.property_id))
			}

			if (query.status) {
				const statusInput = String(query.status).toLowerCase()
				const isValidStatus = VALID_UNIT_STATUSES.includes(
					statusInput as UnitStatus
				)
				if (isValidStatus) {
					queryBuilder = queryBuilder.eq('status', statusInput as UnitStatus)
				}
			}

			// Use safe search to prevent SQL injection
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
			this.logger.error('Unit query service failed to find all units', {
				error: error instanceof Error ? error.message : String(error),
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch units'
			)
		}
	}

	/**
	 * Find one unit by ID via direct Supabase query
	 * Uses getUserClient(token) - RLS automatically filters to user's units
	 */
	async findOne(token: string, unit_id: string): Promise<Unit> {
		try {
			if (!token || !unit_id) {
				this.logger.warn('Find one unit called with missing parameters', {
					unit_id
				})
				throw new BadRequestException(
					'Authentication token and unit ID are required'
				)
			}

			this.logger.log('Finding one unit via RLS-protected query', { unit_id })

			// User-scoped client automatically filters to user's properties
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
				throw new NotFoundException('Unit not found')
			}

			return data as Unit
		} catch (error) {
			this.logger.error('Unit query service failed to find one unit', {
				error: error instanceof Error ? error.message : String(error),
				unit_id
			})
			if (
				error instanceof BadRequestException ||
				error instanceof NotFoundException
			) {
				throw error
			}
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch unit'
			)
		}
	}

	/**
	 * Get units by property via RLS-protected query
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

			const client = this.supabase.getUserClient(token)

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
	 * Get available units for a property (RLS-enforced query)
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

			const client = this.supabase.getUserClient(token)
			const { data, error } = await client
				.from('units')
				.select('*')
				.eq('property_id', property_id)
				.eq('status', 'available')

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

}
