// LeaseStatus type removed - using string literals from database enum
/**
 * Leases Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstractions
 * Simplified: Removed duplicate methods, consolidated analytics
 */

import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger
} from '@nestjs/common'
import type { CreateLeaseDto } from './dto/create-lease.dto'
import type { UpdateLeaseDto } from './dto/update-lease.dto'
import type { Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
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
	 * Get user-scoped Supabase client for direct database access
	 * Used by lease-generator.controller.ts for fetching lease data with relations
	 */
	getUserClient(token: string) {
		return this.supabase.getUserClient(token)
	}

	/**
	 * REMOVED: Manual unit filtering violates RLS pattern
	 * RLS policies automatically filter data to user's scope via getUserClient(token)
	 */

	/**
	 * Get all leases for a user with search and filters
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
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

			// RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			// Build base query for counting (NO manual user_id/unit_id filtering needed)
			let countQuery = client
				.from('leases')
				.select('*', { count: 'exact', head: true })

			// Apply filters to count query
			if (query.property_id) {
				countQuery = countQuery.eq('property_id', String(query.property_id))
			}
			if (query.tenant_id) {
				countQuery = countQuery.eq('primary_tenant_id', String(query.tenant_id))
			}
			if (query.status) {
			countQuery = countQuery.eq(
				'lease_status',
				query.status as string
			)
		}
			if (query.start_date) {
				countQuery = countQuery.gte(
					'start_date',
					new Date(query.start_date as string).toISOString()
				)
			}
			if (query.end_date) {
				countQuery = countQuery.lte(
					'end_date',
					new Date(query.end_date as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					countQuery = countQuery.or(
						buildMultiColumnSearch(sanitized, ['primary_tenant_id', 'unit_id'])
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

			// Build data query with filters (NO manual user_id/unit_id filtering needed)
			let queryBuilder = client.from('leases').select('*')

			// Apply filters
			if (query.property_id) {
				queryBuilder = queryBuilder.eq('property_id', String(query.property_id))
			}
			if (query.tenant_id) {
				queryBuilder = queryBuilder.eq('primary_tenant_id', String(query.tenant_id))
			}
			if (query.status) {
			queryBuilder = queryBuilder.eq(
				'lease_status',
				query.status as string
			)
		}
			if (query.start_date) {
				queryBuilder = queryBuilder.gte(
					'start_date',
					new Date(query.start_date as string).toISOString()
				)
			}
			if (query.end_date) {
				queryBuilder = queryBuilder.lte(
					'end_date',
					new Date(query.end_date as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, ['primary_tenant_id', 'unit_id'])
					)
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
	 * Find one lease by ID
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async findOne(token: string, lease_id: string): Promise<Lease | null> {
		try {
			if (!token || !lease_id) {
				this.logger.warn('Find one lease called with missing parameters', {
					lease_id
				})
				return null
			}

			this.logger.log('Finding one lease via RLS-protected query', {
				lease_id
			})

			// RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
				.from('leases')
				.select('*')
				.eq('id', lease_id)
				.single()

			if (error) {
				this.logger.error('Failed to fetch lease from Supabase', {
					error: error.message,
					lease_id
				})
				return null
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Leases service failed to find one lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id
			})
			return null
		}
	}

	/**
	 * Create lease
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async create(token: string, dto: CreateLeaseDto): Promise<Lease> {
		try {
			if (!token || !dto.unit_id || !dto.primary_tenant_id) {
				this.logger.warn('Create lease called with missing parameters', {
					dto
				})
				throw new BadRequestException(
				'Authentication token, unit ID, and primary tenant ID are required'
			)
			}

			this.logger.log('Creating lease via RLS-protected query', {
				dto
			})

			// RLS SECURITY: User-scoped client automatically validates unit/tenant ownership
			const client = this.supabase.getUserClient(token)

			// Verify unit exists and belongs to user (RLS will enforce ownership)
			const { data: unit } = await client
				.from('units')
				.select('id, property_id')
				.eq('id', dto.unit_id)
				.single()

			if (!unit) {
				throw new BadRequestException('Unit not found or access denied')
			}

			// Verify tenant exists and belongs to user (RLS will enforce ownership)
			const { data: tenant } = await client
				.from('tenants')
				.select('id')
				.eq('id', dto.primary_tenant_id)
				.single()

			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Insert lease directly from DTO (matches database schema)
		const { data, error } = await client
			.from('leases')
			.insert({
				primary_tenant_id: dto.primary_tenant_id,
				unit_id: dto.unit_id,
				start_date: dto.start_date,
				end_date: dto.end_date || '',
				rent_amount: dto.rent_amount,
				security_deposit: dto.security_deposit || 0,
				lease_status: dto.lease_status || 'pending',
				payment_day: 1,
				rent_currency: 'USD'
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async update(
		token: string,
		lease_id: string,
		updateRequest: UpdateLeaseDto
	): Promise<Lease | null> {
		try {
			if (!token || !lease_id) {
				this.logger.warn('Update lease called with missing parameters', {
					lease_id
				})
				return null
			}

			this.logger.log('Updating lease via RLS-protected query', {
				lease_id,
				updateRequest
			})

			// Verify ownership via findOne (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['leases']['Update'] = {
				updated_at: new Date().toISOString()
			}

			// Note: Version-based optimistic locking removed - not in database schema

			if (updateRequest.start_date !== undefined)
				updated_data.start_date = updateRequest.start_date
			if (updateRequest.end_date !== undefined)
				updated_data.end_date = updateRequest.end_date
			if (
				updateRequest.rent_amount !== undefined &&
				updateRequest.rent_amount !== null
			)
				updated_data.rent_amount = updateRequest.rent_amount
			if (
				updateRequest.security_deposit !== undefined &&
				updateRequest.security_deposit !== null
			)
				updated_data.security_deposit = updateRequest.security_deposit
			if (updateRequest.lease_status !== undefined)
			updated_data.lease_status = updateRequest.lease_status

			//Add version check for optimistic locking
			const query = client.from('leases').update(updated_data).eq('id', lease_id)

			// Note: Version-based optimistic locking removed - not in database schema
			// If needed in future, add version column to database first

			const { data, error } = await query.select().single()

			if (error || !data) {
				// Check for not found error (PGRST116 = 0 rows affected)
				if (error?.code === 'PGRST116') {
					this.logger.warn('Lease not found or no changes made', {
						lease_id
					})
					throw new ConflictException(
						'Lease not found or already modified'
					)
				}

				// Other database errors
				this.logger.error('Failed to update lease in Supabase', {
					error: error ? String(error) : 'Unknown error',
					lease_id,
					updateRequest
				})
				throw new BadRequestException('Failed to update lease')
			}

			return data as Lease
		} catch (error) {
			// Re-throw ConflictException as-is
			if (error instanceof ConflictException) {
				throw error
			}

			this.logger.error('Leases service failed to update lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
				updateRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to update lease'
			)
		}
	}

	/**
	 * Remove lease (hard delete - no soft delete column in schema)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async remove(token: string, lease_id: string): Promise<void> {
		try {
			if (!token || !lease_id) {
				this.logger.warn('Remove lease called with missing parameters', {
					lease_id
				})
				throw new BadRequestException(
					'Authentication token and lease ID are required'
				)
			}

			this.logger.log('Removing lease via RLS-protected query', {
				lease_id
			})

			// Verify ownership via findOne (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const { error } = await client.from('leases').delete().eq('id', lease_id)

			if (error) {
				this.logger.error('Failed to delete lease in Supabase', {
					error: error.message,
					lease_id
				})
				throw new BadRequestException('Failed to delete lease')
			}
		} catch (error) {
			this.logger.error('Leases service failed to remove lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove lease'
			)
		}
	}

	/**
	 * Renew lease - consolidated method with validation
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async renew(
		token: string,
		lease_id: string,
		newEndDate: string,
		newRentAmount?: number
	): Promise<Lease | null> {
		try {
			this.logger.log('Renewing lease via RLS-protected query', {
				lease_id,
				newEndDate,
				newRentAmount
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
			if (!existingLease) {
				throw new BadRequestException('Lease not found or access denied')
			}

			// Month-to-month leases cannot be renewed (no fixed end date)
			if (!existingLease.end_date) {
				throw new BadRequestException(
					'Cannot renew a month-to-month lease. Convert to fixed-term first.'
				)
			}

			// Validate new end date is after current
			const currentEndDate = new Date(existingLease.end_date)
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

			// RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['leases']['Update'] = {
				end_date: newEndDate,
				updated_at: new Date().toISOString()
			}
			if (newRentAmount) updated_data.rent_amount = newRentAmount

			const { data, error } = await client
				.from('leases')
				.update(updated_data)
				.eq('id', lease_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to renew lease in Supabase', {
					error: error.message,
					lease_id
				})
				throw new BadRequestException('Failed to renew lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to renew lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
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
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async terminate(
		token: string,
		lease_id: string,
		terminationDate: string,
		reason?: string
	): Promise<Lease | null> {
		try {
			this.logger.log('Terminating lease via RLS-protected query', {
				lease_id,
				terminationDate,
				reason
			})

			// Verify ownership and lease exists (RLS will enforce ownership)
			const existingLease = await this.findOne(token, lease_id)
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
				existingLease.lease_status === 'terminated' ||
				existingLease.lease_status === 'ended'
			) {
				throw new BadRequestException('Lease is already terminated or expired')
			}

			// RLS SECURITY: User-scoped client automatically validates ownership
			const client = this.supabase.getUserClient(token)

			const { data, error } = await client
			.from('leases')
			.update({
				lease_status: 'terminated',
				end_date: terminationDate,
				updated_at: new Date().toISOString()
			})
				.eq('id', lease_id)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to terminate lease in Supabase', {
					error: error.message,
					lease_id
				})
				throw new BadRequestException('Failed to terminate lease')
			}

			return data as Lease
		} catch (error) {
			this.logger.error('Failed to terminate lease', {
				error: error instanceof Error ? error.message : String(error),
				lease_id,
				terminationDate,
				reason
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to terminate lease')
		}
	}
}
