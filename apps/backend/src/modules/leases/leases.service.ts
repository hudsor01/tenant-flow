/**
 * Leases Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed duplicate methods, consolidated analytics
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import type { CreateLeaseDto } from './dto/create-lease.dto'
import type { UpdateLeaseDto } from './dto/update-lease.dto'
import type { Lease, LeaseStatsResponse } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

@Injectable()
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly queryHelpers: SupabaseQueryHelpers
	) {}

	/**
	 * Get user-scoped Supabase client for direct database access
	 * Used by lease-generator.controller.ts for fetching lease data with relations
	 */
	getUserClient(token: string) {
		return this.supabase.getUserClient(token)
	}

	/**
	 * ❌ REMOVED: Manual unit filtering violates RLS pattern
	 * RLS policies automatically filter data to user's scope via getUserClient(token)
	 */

	/**
	 * Get all leases for a user with search and filters
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async findAll(
		token: string,
		query: Record<string, unknown>
	): Promise<{ data: Lease[]; total: number; limit: number; offset: number }> {
		try {
			if (!token) {
				this.logger.warn('Find all leases requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Finding all leases via RLS-protected query', {
				query
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			// Build base query for counting (NO manual userId/unitId filtering needed)
			let countQuery = client
				.from('lease')
				.select('*', { count: 'exact', head: true })

			// Apply filters to count query
			if (query.propertyId) {
				countQuery = countQuery.eq('propertyId', String(query.propertyId))
			}
			if (query.tenantId) {
				countQuery = countQuery.eq('tenantId', String(query.tenantId))
			}
			if (query.status) {
				countQuery = countQuery.eq(
					'status',
					query.status as Database['public']['Enums']['LeaseStatus']
				)
			}
			if (query.startDate) {
				countQuery = countQuery.gte(
					'startDate',
					new Date(query.startDate as string).toISOString()
				)
			}
			if (query.endDate) {
				countQuery = countQuery.lte(
					'endDate',
					new Date(query.endDate as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					countQuery = countQuery.or(
						buildMultiColumnSearch(sanitized, ['tenantId', 'unitId'])
					)
				}
			}

			// Get total count
			const { count, error: countError } = await countQuery
			if (countError) {
				this.logger.error('Failed to count leases', {
					error: countError.message,
					query
				})
				throw new BadRequestException('Failed to count leases')
			}

			// Build data query with filters (NO manual userId/unitId filtering needed)
			let queryBuilder = client.from('lease').select('*')

			// Apply filters
			if (query.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', String(query.propertyId))
			}
			if (query.tenantId) {
				queryBuilder = queryBuilder.eq('tenantId', String(query.tenantId))
			}
			if (query.status) {
				queryBuilder = queryBuilder.eq(
					'status',
					query.status as Database['public']['Enums']['LeaseStatus']
				)
			}
			if (query.startDate) {
				queryBuilder = queryBuilder.gte(
					'startDate',
					new Date(query.startDate as string).toISOString()
				)
			}
			if (query.endDate) {
				queryBuilder = queryBuilder.lte(
					'endDate',
					new Date(query.endDate as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, ['tenantId', 'unitId'])
					)
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
				this.logger.error('Failed to fetch leases from Supabase', {
					error: error.message,
					query
				})
				throw new BadRequestException('Failed to fetch leases')
			}

			return {
				data: data as Lease[],
				total: count ?? 0,
				limit,
				offset
			}
		} catch (error) {
			this.logger.error('Leases service failed to find all leases', {
				error: error instanceof Error ? error.message : String(error),
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch leases'
			)
		}
	}

	/**
	 * Get lease statistics
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getStats(token: string): Promise<LeaseStatsResponse> {
		try {
			if (!token) {
				this.logger.warn('Lease stats requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting lease stats via RLS-protected query')

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			type LeaseRow = Database['public']['Tables']['lease']['Row']

			const leases = await this.queryHelpers.queryList<LeaseRow>(
				client.from('lease').select('*'),
				{
					resource: 'lease',
					operation: 'findAll'
				}
			)
			const now = new Date()
			const thirtyDaysFromNow = new Date(
				now.getTime() + 30 * 24 * 60 * 60 * 1000
			)

			const stats = {
				totalLeases: leases.length,
				activeLeases: leases.filter((l: LeaseRow) => l.status === 'ACTIVE')
					.length,
				expiredLeases: leases.filter((l: LeaseRow) => l.status === 'EXPIRED')
					.length,
				terminatedLeases: leases.filter(
					(l: LeaseRow) => l.status === 'TERMINATED'
				).length,
				totalMonthlyRent: leases
					.filter((l: LeaseRow) => l.status === 'ACTIVE')
					.reduce((sum: number, l: LeaseRow) => sum + (l.rentAmount || 0), 0),
				averageRent:
					leases.length > 0
						? leases.reduce(
								(sum: number, l: LeaseRow) => sum + (l.rentAmount || 0),
								0
							) / leases.length
						: 0,
				totalSecurityDeposits: leases.reduce(
					(sum: number, l: LeaseRow) => sum + (l.securityDeposit || 0),
					0
				),
				expiringLeases: leases.filter((l: LeaseRow) => {
					// Skip month-to-month leases (endDate is null)
					if (!l.endDate) return false
					const endDate = new Date(l.endDate)
					return endDate > now && endDate <= thirtyDaysFromNow
				}).length
			}

			return stats
		} catch (error) {
			this.logger.error('Leases service failed to get stats', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error
					? error.message
					: 'Failed to get lease statistics'
			)
		}
	}

	/**
	 * Get leases expiring soon
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getExpiring(token: string, days: number = 30): Promise<Lease[]> {
		try {
			if (!token) {
				this.logger.warn('Expiring leases requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting expiring leases via RLS-protected query', {
				days
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			const now = new Date()
			const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

			const { data, error } = await client
				.from('lease')
				.select('*')
				.eq('status', 'ACTIVE')
				.gte('end_date', now.toISOString())
				.lte('end_date', futureDate.toISOString())
				.order('end_date', { ascending: true })

			if (error) {
				this.logger.error('Failed to get expiring leases from Supabase', {
					error: error.message,
					days
				})
				throw new BadRequestException('Failed to get expiring leases')
			}

			return data as Lease[]
		} catch (error) {
			this.logger.error('Leases service failed to get expiring leases', {
				error: error instanceof Error ? error.message : String(error),
				days
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get expiring leases'
			)
		}
	}

	/**
	 * Find one lease by ID
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async findOne(token: string, leaseId: string): Promise<Lease> {
		if (!token) {
			throw new UnauthorizedException('Authentication token is required')
		}
		if (!leaseId) {
			throw new BadRequestException('Lease ID is required')
		}

		this.logger.log('Finding one lease via RLS-protected query', { leaseId })

		// ✅ RLS SECURITY: User-scoped client automatically filters to user's leases
		const client = this.supabase.getUserClient(token)

		return this.queryHelpers.querySingle<Lease>(
			client.from('lease').select('*').eq('id', leaseId).single(),
			{
				resource: 'lease',
				id: leaseId,
				operation: 'findOne'
			}
		)
	}

	/**
	 * Create lease
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async create(token: string, dto: CreateLeaseDto): Promise<Lease> {
		try {
			if (!token || !dto.unitId || !dto.tenantId) {
				this.logger.warn('Create lease called with missing parameters', {
					dto
				})
				throw new BadRequestException(
					'Authentication token, unit ID, and tenant ID are required'
				)
			}

			this.logger.log('Creating lease via RLS-protected query', {
				dto
			})

			// ✅ RLS SECURITY: User-scoped client automatically validates unit/tenant ownership
			const client = this.supabase.getUserClient(token)

			// Verify unit exists and belongs to user (RLS will enforce ownership)
			const { data: unit } = await client
				.from('unit')
				.select('id, propertyId')
				.eq('id', dto.unitId)
				.single()

			if (!unit) {
				throw new BadRequestException('Unit not found or access denied')
			}

			// Verify tenant exists and belongs to user (RLS will enforce ownership)
			const { data: tenant } = await client
				.from('tenant')
				.select('id')
				.eq('id', dto.tenantId)
				.single()

			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Insert lease directly from DTO (matches database schema)
			const { data, error } = await client
				.from('lease')
				.insert({
					tenantId: dto.tenantId,
					unitId: dto.unitId,
					startDate: dto.startDate,
					endDate: dto.endDate || null,
					rentAmount: dto.rentAmount,
					securityDeposit: dto.securityDeposit || 0,
					status: (dto.status ||
						'DRAFT') as Database['public']['Enums']['LeaseStatus'],
					terms: dto.terms || null,
					propertyId: dto.propertyId || null,
					monthlyRent: dto.monthlyRent || null
				})
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create lease in Supabase', {
					error: error.message,
					dto
				})
				throw new BadRequestException('Failed to create lease')
			}

			const lease = data as Lease

			return lease
		} catch (error) {
			this.logger.error('Leases service failed to create lease', {
				error: error instanceof Error ? error.message : String(error),
				dto
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create lease'
			)
		}
	}

	/**
	 * Update lease
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async update(
		token: string,
		leaseId: string,
		updateRequest: UpdateLeaseDto,
		expectedVersion?: number //Optimistic locking
	): Promise<Lease> {
		if (!token) {
			throw new UnauthorizedException('Authentication token is required')
		}
		if (!leaseId) {
			throw new BadRequestException('Lease ID is required')
		}

		this.logger.log('Updating lease via RLS-protected query', {
			leaseId,
			updateRequest
		})

		// Verify ownership via findOne (throws NotFoundException if not found)
		await this.findOne(token, leaseId)

		// ✅ RLS SECURITY: User-scoped client automatically validates ownership
		const client = this.supabase.getUserClient(token)

		const updateData: Database['public']['Tables']['lease']['Update'] = {
			updatedAt: new Date().toISOString()
		}

		//Increment version for optimistic locking
		if (expectedVersion !== undefined) {
			updateData.version = expectedVersion + 1
		}

		if (updateRequest.startDate !== undefined)
			updateData.startDate = updateRequest.startDate
		if (updateRequest.endDate !== undefined)
			updateData.endDate = updateRequest.endDate
		if (
			updateRequest.rentAmount !== undefined &&
			updateRequest.rentAmount !== null
		)
			updateData.rentAmount = updateRequest.rentAmount
		if (
			updateRequest.securityDeposit !== undefined &&
			updateRequest.securityDeposit !== null
		)
			updateData.securityDeposit = updateRequest.securityDeposit
		if (updateRequest.status !== undefined)
			updateData.status =
				updateRequest.status as Database['public']['Enums']['LeaseStatus']

		//Add version check for optimistic locking
		const query = client.from('lease').update(updateData).eq('id', leaseId)

		// Use version-aware query if expectedVersion provided
		if (expectedVersion !== undefined) {
			return this.queryHelpers.querySingleWithVersion<Lease>(
				query.eq('version', expectedVersion).select().single(),
				{
					resource: 'lease',
					id: leaseId,
					operation: 'update',
					metadata: { expectedVersion }
				}
			)
		}

		// Otherwise use regular query
		return this.queryHelpers.querySingle<Lease>(
			query.select().single(),
			{
				resource: 'lease',
				id: leaseId,
				operation: 'update'
			}
		)
	}

	/**
	 * Remove lease (hard delete - no soft delete column in schema)
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async remove(token: string, leaseId: string): Promise<void> {
		try {
			if (!token || !leaseId) {
				this.logger.warn('Remove lease called with missing parameters', {
					leaseId
				})
				throw new BadRequestException(
					'Authentication token and lease ID are required'
				)
			}

			this.logger.log('Removing lease via RLS-protected query', {
				leaseId
			})

			// Verify ownership via findOne (throws NotFoundException if not found)
			await this.findOne(token, leaseId)

			// ✅ RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const { error } = await client.from('lease').delete().eq('id', leaseId)

			if (error) {
				this.logger.error('Failed to delete lease in Supabase', {
					error: error.message,
					leaseId
				})
				throw new BadRequestException('Failed to delete lease')
			}
		} catch (error) {
			this.logger.error('Leases service failed to remove lease', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove lease'
			)
		}
	}

	/**
	 * Renew lease - consolidated method with validation
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async renew(
		token: string,
		leaseId: string,
		newEndDate: string,
		newRentAmount?: number
	): Promise<Lease | null> {
		try {
			this.logger.log('Renewing lease via RLS-protected query', {
				leaseId,
				newEndDate,
				newRentAmount
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, leaseId)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// Month-to-month leases cannot be renewed (no fixed end date)
			if (!existingLease.endDate) {
				throw new BadRequestException(
					'Cannot renew a month-to-month lease. Convert to fixed-term first.'
				)
			}

			// Validate new end date is after current
			const currentEndDate = new Date(existingLease.endDate)
			const renewalEndDate = new Date(newEndDate)
			if (renewalEndDate <= currentEndDate) {
				throw new BadRequestException(
					'New end date must be after current lease end date'
				)
			}

			// Validate new rent amount if provided
			if (newRentAmount && newRentAmount <= 0) {
				throw new BadRequestException('Rent amount must be positive')
			}

			// ✅ RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const updateData: Database['public']['Tables']['lease']['Update'] = {
				endDate: newEndDate,
				updatedAt: new Date().toISOString()
			}
			if (newRentAmount) updateData.rentAmount = newRentAmount

			const { data, error } = await client
				.from('lease')
				.update(updateData)
				.eq('id', leaseId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to renew lease in Supabase', {
					error: error.message,
					leaseId
				})
				throw new BadRequestException('Failed to renew lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to renew lease', {
				error: error instanceof Error ? error.message : String(error),
				leaseId,
				newEndDate,
				newRentAmount
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to renew lease')
		}
	}

	/**
	 * Terminate lease - consolidated method with validation
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async terminate(
		token: string,
		leaseId: string,
		terminationDate: string,
		reason?: string
	): Promise<Lease | null> {
		try {
			this.logger.log('Terminating lease via RLS-protected query', {
				leaseId,
				terminationDate,
				reason
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, leaseId)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// Validate termination date
			const termDate = new Date(terminationDate)
			const currentDate = new Date()
			if (termDate < currentDate) {
				throw new BadRequestException('Termination date cannot be in the past')
			}

			// Check if lease is already terminated
			if (
				existingLease.status === 'TERMINATED' ||
				existingLease.status === 'EXPIRED'
			) {
				throw new BadRequestException('Lease is already terminated or expired')
			}

			// ✅ RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('lease')
				.update({
					status: 'TERMINATED' as Database['public']['Enums']['LeaseStatus'],
					endDate: terminationDate,
					terms: reason || null,
					updatedAt: new Date().toISOString()
				})
				.eq('id', leaseId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to terminate lease in Supabase', {
					error: error.message,
					leaseId
				})
				throw new BadRequestException('Failed to terminate lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to terminate lease', {
				error: error instanceof Error ? error.message : String(error),
				leaseId,
				terminationDate,
				reason
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to terminate lease')
		}
	}

	/**
	 * Get lease analytics - consolidated single method
	 * Replaces: getAnalytics, getLeasePerformanceAnalytics, getLeaseDurationAnalytics,
	 * getLeaseTurnoverAnalytics, getLeaseRevenueAnalytics
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async getAnalytics(
		token: string,
		options: {
			leaseId?: string
			propertyId?: string
			timeframe: string
			period?: string
		}
	): Promise<unknown[]> {
		try {
			if (!token) {
				this.logger.warn('Lease analytics requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting lease analytics via RLS-protected query', {
				options
			})

			// ✅ RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			let queryBuilder = client.from('lease').select('*')

			if (options.leaseId) {
				queryBuilder = queryBuilder.eq('id', options.leaseId)
			}

			if (options.propertyId) {
				queryBuilder = queryBuilder.eq('propertyId', options.propertyId)
			}

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to fetch lease analytics from Supabase', {
					error: error.message,
					options
				})
				throw new BadRequestException('Failed to get lease analytics')
			}

			return data || []
		} catch (error) {
			this.logger.error('Leases service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease analytics'
			)
		}
	}

	/**
	 * Get lease payment history
	 * ✅ RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async getPaymentHistory(token: string, leaseId: string): Promise<unknown[]> {
		try {
			if (!token || !leaseId) {
				this.logger.warn('Payment history requested with missing parameters', {
					leaseId
				})
				throw new BadRequestException(
					'Authentication token and lease ID are required'
				)
			}

			// Verify ownership (RLS will enforce ownership)
			const lease = await this.findOne(token, leaseId)
			if (!lease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			this.logger.log('Getting lease payment history via RLS-protected query', {
				leaseId
			})

			// ✅ RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('rent_payment')
				.select('*')
				.eq('lease_id', leaseId)
				.order('payment_date', { ascending: false })

			if (error) {
				this.logger.error('Failed to fetch payment history from Supabase', {
					error: error.message,
					leaseId
				})
				return []
			}

			return data || []
		} catch (error) {
			this.logger.error('Leases service failed to get payment history', {
				error: error instanceof Error ? error.message : String(error),
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get payment history'
			)
		}
	}
}
