/**
 * Leases Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed duplicate methods, consolidated analytics
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest
} from '@repo/shared/types/backend-domain'
import type { Lease, LeaseStatsResponse } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

@Injectable()
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Helper: Get unit IDs for user's properties
	 * Used to filter leases since lease table doesn't have org_id
	 */
	private async getUserUnitIds(userId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		// Get user's property IDs
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('ownerId', userId)

		const propertyIds = properties?.map(p => p.id) || []
		if (propertyIds.length === 0) return []

		// Get unit IDs for those properties
		const { data: units } = await client
			.from('unit')
			.select('id')
			.in('propertyId', propertyIds)

		return units?.map(u => u.id) || []
	}

	/**
	 * Helper: Get unit IDs for a specific property
	 */
	private async getPropertyUnitIds(propertyId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		const { data: units } = await client
			.from('unit')
			.select('id')
			.eq('propertyId', propertyId)

		return units?.map(u => u.id) || []
	}

	/**
	 * Get all leases for a user with search and filters
	 */
	async findAll(
		userId: string,
		query: Record<string, unknown>
	): Promise<Lease[]> {
		try {
			if (!userId) {
				this.logger.warn('Find all leases requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Finding all leases via direct Supabase query', {
				userId,
				query
			})

			const client = this.supabase.getAdminClient()

			// Get unit IDs based on filters
			let unitIds: string[]
			if (query.propertyId) {
				// Filter by specific property
				unitIds = await this.getPropertyUnitIds(query.propertyId as string)
			} else {
				// Get all user's units
				unitIds = await this.getUserUnitIds(userId)
			}

			// Return empty array if no units found
			if (unitIds.length === 0) {
				return []
			}

			// Build query with filters
			let queryBuilder = client.from('lease').select('*').in('unitId', unitIds)

			// Apply filters
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
					userId,
					query
				})
				throw new BadRequestException('Failed to fetch leases')
			}

			return data as Lease[]
		} catch (error) {
			this.logger.error('Leases service failed to find all leases', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch leases'
			)
		}
	}

	/**
	 * Get lease statistics
	 */
	async getStats(userId: string): Promise<LeaseStatsResponse> {
		try {
			if (!userId) {
				this.logger.warn('Lease stats requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease stats via direct Supabase query', {
				userId
			})

			const client = this.supabase.getAdminClient()

			// Get user's unit IDs
			const unitIds = await this.getUserUnitIds(userId)
			if (unitIds.length === 0) {
				// Return empty stats if user has no units
				return {
					totalLeases: 0,
					activeLeases: 0,
					expiredLeases: 0,
					terminatedLeases: 0,
					totalMonthlyRent: 0,
					averageRent: 0,
					totalSecurityDeposits: 0,
					expiringLeases: 0
				}
			}

			const { data, error } = await client
				.from('lease')
				.select('*')
				.in('unitId', unitIds)

			if (error) {
				this.logger.error('Failed to get lease stats from Supabase', {
					error: error.message,
					userId
				})
				throw new BadRequestException('Failed to get lease statistics')
			}

			const leases = data || []
			const now = new Date()
			const thirtyDaysFromNow = new Date(
				now.getTime() + 30 * 24 * 60 * 60 * 1000
			)

			type LeaseRow = Database['public']['Tables']['lease']['Row']

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
					const endDate = new Date(l.endDate)
					return endDate > now && endDate <= thirtyDaysFromNow
				}).length
			}

			return stats
		} catch (error) {
			this.logger.error('Leases service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
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
	 */
	async getExpiring(userId: string, days: number = 30): Promise<Lease[]> {
		try {
			if (!userId) {
				this.logger.warn('Expiring leases requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting expiring leases via direct Supabase query', {
				userId,
				days
			})

			const client = this.supabase.getAdminClient()

			// Get user's unit IDs
			const unitIds = await this.getUserUnitIds(userId)
			if (unitIds.length === 0) {
				return []
			}

			const now = new Date()
			const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

			const { data, error } = await client
				.from('lease')
				.select('*')
				.in('unitId', unitIds)
				.eq('status', 'ACTIVE')
				.gte('end_date', now.toISOString())
				.lte('end_date', futureDate.toISOString())
				.order('end_date', { ascending: true })

			if (error) {
				this.logger.error('Failed to get expiring leases from Supabase', {
					error: error.message,
					userId,
					days
				})
				throw new BadRequestException('Failed to get expiring leases')
			}

			return data as Lease[]
		} catch (error) {
			this.logger.error('Leases service failed to get expiring leases', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				days
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get expiring leases'
			)
		}
	}

	/**
	 * Find one lease by ID
	 */
	async findOne(userId: string, leaseId: string): Promise<Lease | null> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Find one lease called with missing parameters', {
					userId,
					leaseId
				})
				return null
			}

			this.logger.log('Finding one lease via direct Supabase query', {
				userId,
				leaseId
			})

			const client = this.supabase.getAdminClient()

			// Get user's unit IDs for ownership verification
			const unitIds = await this.getUserUnitIds(userId)
			if (unitIds.length === 0) {
				return null
			}

			const { data, error } = await client
				.from('lease')
				.select('*')
				.eq('id', leaseId)
				.in('unitId', unitIds)
				.single()

			if (error) {
				this.logger.error('Failed to fetch lease from Supabase', {
					error: error.message,
					userId,
					leaseId
				})
				return null
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Leases service failed to find one lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			return null
		}
	}

	/**
	 * Create lease
	 */
	async create(
		userId: string,
		createRequest: CreateLeaseRequest
	): Promise<Lease> {
		try {
			if (!userId || !createRequest.tenantId || !createRequest.unitId) {
				this.logger.warn('Create lease called with missing parameters', {
					userId,
					createRequest
				})
				throw new BadRequestException(
					'User ID, tenant ID, and unit ID are required'
				)
			}

			this.logger.log('Creating lease via direct Supabase query', {
				userId,
				createRequest
			})

			const client = this.supabase.getAdminClient()

			// Verify unit belongs to user
			const { data: unit } = await client
				.from('unit')
				.select('propertyId')
				.eq('id', createRequest.unitId)
				.single()

			if (!unit) {
				throw new BadRequestException('Unit not found')
			}

			const { data: property } = await client
				.from('property')
				.select('ownerId')
				.eq('id', unit.propertyId)
				.single()

			if (!property || property.ownerId !== userId) {
				throw new BadRequestException('Unit does not belong to user')
			}

			const leaseData = {
				tenantId: createRequest.tenantId,
				unitId: createRequest.unitId,
				startDate: createRequest.startDate,
				endDate: createRequest.endDate,
				rentAmount: createRequest.monthlyRent,
				securityDeposit: createRequest.securityDeposit || 0,
				status: (createRequest.status ||
					'DRAFT') as Database['public']['Enums']['LeaseStatus']
			}

			const { data, error } = await client
				.from('lease')
				.insert(leaseData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create lease in Supabase', {
					error: error.message,
					userId,
					createRequest
				})
				throw new BadRequestException('Failed to create lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Leases service failed to create lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				createRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create lease'
			)
		}
	}

	/**
	 * Update lease
	 */
	async update(
		userId: string,
		leaseId: string,
		updateRequest: UpdateLeaseRequest
	): Promise<Lease | null> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Update lease called with missing parameters', {
					userId,
					leaseId
				})
				return null
			}

			this.logger.log('Updating lease via direct Supabase query', {
				userId,
				leaseId,
				updateRequest
			})

			// Verify ownership via findOne
			const existingLease = await this.findOne(userId, leaseId)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			const client = this.supabase.getAdminClient()

			const updateData: Database['public']['Tables']['lease']['Update'] = {
				updatedAt: new Date().toISOString()
			}

			if (updateRequest.startDate !== undefined)
				updateData.startDate = updateRequest.startDate
			if (updateRequest.endDate !== undefined)
				updateData.endDate = updateRequest.endDate
			if (updateRequest.monthlyRent !== undefined)
				updateData.rentAmount = updateRequest.monthlyRent
			if (updateRequest.securityDeposit !== undefined)
				updateData.securityDeposit = updateRequest.securityDeposit
			if (updateRequest.status !== undefined)
				updateData.status = updateRequest.status

			const { data, error } = await client
				.from('lease')
				.update(updateData)
				.eq('id', leaseId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update lease in Supabase', {
					error: error.message,
					userId,
					leaseId,
					updateRequest
				})
				return null
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Leases service failed to update lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId,
				updateRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to update lease'
			)
		}
	}

	/**
	 * Remove lease (hard delete - no soft delete column in schema)
	 */
	async remove(userId: string, leaseId: string): Promise<void> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Remove lease called with missing parameters', {
					userId,
					leaseId
				})
				throw new BadRequestException('User ID and lease ID are required')
			}

			this.logger.log('Removing lease via direct Supabase query', {
				userId,
				leaseId
			})

			// Verify ownership via findOne
			const existingLease = await this.findOne(userId, leaseId)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			const client = this.supabase.getAdminClient()

			const { error } = await client.from('lease').delete().eq('id', leaseId)

			if (error) {
				this.logger.error('Failed to delete lease in Supabase', {
					error: error.message,
					userId,
					leaseId
				})
				throw new BadRequestException('Failed to delete lease')
			}
		} catch (error) {
			this.logger.error('Leases service failed to remove lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove lease'
			)
		}
	}

	/**
	 * Renew lease - consolidated method with validation
	 */
	async renew(
		userId: string,
		leaseId: string,
		newEndDate: string,
		newRentAmount?: number
	): Promise<Lease | null> {
		try {
			this.logger.log('Renewing lease via direct Supabase query', {
				userId,
				leaseId,
				newEndDate,
				newRentAmount
			})

			// Verify ownership and lease exists
			const existingLease = await this.findOne(userId, leaseId)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
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

			// Update lease
			const client = this.supabase.getAdminClient()

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
					userId,
					leaseId
				})
				throw new BadRequestException('Failed to renew lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to renew lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
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
	 */
	async terminate(
		userId: string,
		leaseId: string,
		terminationDate: string,
		reason?: string
	): Promise<Lease | null> {
		try {
			this.logger.log('Terminating lease via direct Supabase query', {
				userId,
				leaseId,
				terminationDate,
				reason
			})

			// Verify ownership and lease exists
			const existingLease = await this.findOne(userId, leaseId)
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

			// Update lease status
			const client = this.supabase.getAdminClient()

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
					userId,
					leaseId
				})
				throw new BadRequestException('Failed to terminate lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to terminate lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
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
	 */
	async getAnalytics(
		userId: string,
		options: {
			leaseId?: string
			propertyId?: string
			timeframe: string
			period?: string
		}
	): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease analytics via direct Supabase query', {
				userId,
				options
			})

			const client = this.supabase.getAdminClient()

			// Get unit IDs based on filters
			let unitIds: string[]
			if (options.propertyId) {
				// Filter by specific property
				unitIds = await this.getPropertyUnitIds(options.propertyId)
			} else {
				// Get all user's units
				unitIds = await this.getUserUnitIds(userId)
			}

			// Return empty array if no units found
			if (unitIds.length === 0) {
				return []
			}

			let queryBuilder = client.from('lease').select('*').in('unitId', unitIds)

			if (options.leaseId) {
				queryBuilder = queryBuilder.eq('id', options.leaseId)
			}

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to fetch lease analytics from Supabase', {
					error: error.message,
					userId,
					options
				})
				throw new BadRequestException('Failed to get lease analytics')
			}

			return data || []
		} catch (error) {
			this.logger.error('Leases service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease analytics'
			)
		}
	}

	/**
	 * Get lease payment history
	 */
	async getPaymentHistory(userId: string, leaseId: string): Promise<unknown[]> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Payment history requested with missing parameters', {
					userId,
					leaseId
				})
				throw new BadRequestException('User ID and lease ID are required')
			}

			// Verify ownership
			const lease = await this.findOne(userId, leaseId)
			if (!lease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			this.logger.log(
				'Getting lease payment history via direct Supabase query',
				{
					userId,
					leaseId
				}
			)

			const client = this.supabase.getAdminClient()

			const { data, error } = await client
				.from('rent_payment')
				.select('*')
				.eq('lease_id', leaseId)
				.order('payment_date', { ascending: false })

			if (error) {
				this.logger.error('Failed to fetch payment history from Supabase', {
					error: error.message,
					userId,
					leaseId
				})
				return []
			}

			return data || []
		} catch (error) {
			this.logger.error('Leases service failed to get payment history', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get payment history'
			)
		}
	}
}
