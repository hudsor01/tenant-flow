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
	NotFoundException
} from '@nestjs/common'
import type { CreateLeaseDto } from './dto/create-lease.dto'
import type { UpdateLeaseDto } from './dto/update-lease.dto'
import type { Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

@Injectable()
export class LeasesService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

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
				countQuery = countQuery.eq('lease_status', query.status as string)
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
				queryBuilder = queryBuilder.eq(
					'primary_tenant_id',
					String(query.tenant_id)
				)
			}
			if (query.status) {
				queryBuilder = queryBuilder.eq('lease_status', query.status as string)
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
	async findOne(token: string, lease_id: string): Promise<Lease> {
		// FAIL FAST: Validate inputs immediately
		if (!token || !lease_id) {
			this.logger.warn('Find one lease called with missing parameters', {
				lease_id
			})
			throw new BadRequestException(
				'Authentication token and lease ID are required'
			)
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
			throw new BadRequestException('Failed to fetch lease')
		}

		if (!data) {
			throw new NotFoundException(`Lease with ID ${lease_id} not found`)
		}

		return data as Lease
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

			// Build insert data with all fields from DTO
			const insertData: Database['public']['Tables']['leases']['Insert'] = {
				primary_tenant_id: dto.primary_tenant_id,
				unit_id: dto.unit_id,
				start_date: dto.start_date,
				end_date: dto.end_date || '',
				rent_amount: dto.rent_amount,
				security_deposit: dto.security_deposit || 0,
				lease_status: dto.lease_status || 'draft',
				payment_day: dto.payment_day ?? 1,
				rent_currency: dto.rent_currency || 'USD',
				grace_period_days: dto.grace_period_days ?? null,
				late_fee_amount: dto.late_fee_amount ?? null,
				late_fee_days: dto.late_fee_days ?? null,
				auto_pay_enabled: dto.auto_pay_enabled ?? false
			}

			// Add lease detail fields if provided (wizard flow)
			const dtoWithDetails = dto as CreateLeaseDto & {
				max_occupants?: number | null
				pets_allowed?: boolean
				pet_deposit?: number | null
				pet_rent?: number | null
				utilities_included?: string[]
				tenant_responsible_utilities?: string[]
				property_rules?: string | null
				property_built_before_1978?: boolean
				lead_paint_disclosure_acknowledged?: boolean | null
				governing_state?: string
			}

			if (dtoWithDetails.max_occupants !== undefined) {
				insertData.max_occupants = dtoWithDetails.max_occupants
			}
			if (dtoWithDetails.pets_allowed !== undefined) {
				insertData.pets_allowed = dtoWithDetails.pets_allowed
			}
			if (dtoWithDetails.pet_deposit !== undefined) {
				insertData.pet_deposit = dtoWithDetails.pet_deposit
			}
			if (dtoWithDetails.pet_rent !== undefined) {
				insertData.pet_rent = dtoWithDetails.pet_rent
			}
			if (dtoWithDetails.utilities_included !== undefined) {
				insertData.utilities_included = dtoWithDetails.utilities_included
			}
			if (dtoWithDetails.tenant_responsible_utilities !== undefined) {
				insertData.tenant_responsible_utilities =
					dtoWithDetails.tenant_responsible_utilities
			}
			if (dtoWithDetails.property_rules !== undefined) {
				insertData.property_rules = dtoWithDetails.property_rules
			}
			if (dtoWithDetails.property_built_before_1978 !== undefined) {
				insertData.property_built_before_1978 =
					dtoWithDetails.property_built_before_1978
			}
			if (dtoWithDetails.lead_paint_disclosure_acknowledged !== undefined) {
				insertData.lead_paint_disclosure_acknowledged =
					dtoWithDetails.lead_paint_disclosure_acknowledged
			}
			if (dtoWithDetails.governing_state !== undefined) {
				insertData.governing_state = dtoWithDetails.governing_state
			}

			// Insert lease with all fields
			const { data, error } = await client
				.from('leases')
				.insert(insertData)
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
	): Promise<Lease> {
		// FAIL FAST: Validate inputs immediately
		if (!token || !lease_id) {
			this.logger.warn('Update lease called with missing parameters', {
				lease_id
			})
			throw new BadRequestException(
				'Authentication token and lease ID are required'
			)
		}

		this.logger.log('Updating lease via RLS-protected query', {
			lease_id,
			updateRequest
		})

		// Verify ownership via findOne (will throw NotFoundException if not found)
		await this.findOne(token, lease_id)

		// RLS SECURITY: User-scoped client automatically validates ownership
		const client = this.supabase.getUserClient(token)

		const updated_data: Database['public']['Tables']['leases']['Update'] = {
			updated_at: new Date().toISOString()
		}

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

		const query = client.from('leases').update(updated_data).eq('id', lease_id)

		const { data, error } = await query.select().single()

		if (error || !data) {
			// Check for not found error (PGRST116 = 0 rows affected)
			if (error?.code === 'PGRST116') {
				this.logger.warn('Lease not found or no changes made', {
					lease_id
				})
				throw new ConflictException('Lease not found or already modified')
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
	}

	/**
	 * Remove lease (hard delete - no soft delete column in schema)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async remove(token: string, lease_id: string): Promise<void> {
		// FAIL FAST: Validate inputs immediately
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

		// Verify ownership via findOne (will throw NotFoundException if not found)
		await this.findOne(token, lease_id)

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
	}
}
