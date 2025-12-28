// TODO: [VIOLATION] CLAUDE.md Standards - KISS Principle violation
// This file is ~591 lines. Per CLAUDE.md: "Small, Focused Modules - Maximum 300 lines per file"
// Recommended refactoring:
// 1. Extract lease analytics into: `./lease-analytics.service.ts`
// 2. Extract lease search/filtering into: `./lease-search.service.ts`
// 3. Keep core CRUD + status operations in this service

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
import type {
	Lease,
	LeaseStatus,
	LeaseInsert,
	LeaseUpdate,
	Property,
	Unit,
	User,
	Tenant
} from '@repo/shared/types/api-contracts'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { validateLeaseStatus } from '@repo/shared/validation/enum-validators'

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
		query: {
			tenant_id?: string | undefined
			unit_id?: string | undefined
			property_id?: string | undefined
			status?: string | undefined
			start_date?: string | undefined
			end_date?: string | undefined
			search?: string | undefined
			limit?: number | undefined
			offset?: number | undefined
			sortBy?: string | undefined
			sortOrder?: string | undefined
		}
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

			// Build single query with both data and count (NO manual user_id/unit_id filtering needed)
			let queryBuilder = client.from('leases').select('*', { count: 'exact' })

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
				queryBuilder = queryBuilder.eq(
					'lease_status',
					query.status as LeaseStatus
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

			const { data, count, error } = await queryBuilder

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

			const { error: assertError } = await client.rpc(
				'assert_can_create_lease',
				{
					p_unit_id: dto.unit_id,
					p_primary_tenant_id: dto.primary_tenant_id
				}
			)

			if (assertError) {
				throw new BadRequestException(assertError.message)
			}

			const unitResult = await client
				.from('units')
				.select('id, property_id, property:properties(name, owner_user_id)')
				.eq('id', dto.unit_id)
				.single()

			const unit = unitResult.data

			if (!unit) {
				throw new BadRequestException('Unit not found or access denied')
			}

			if (
				dto.rent_amount !== undefined &&
				dto.rent_amount !== null &&
				dto.rent_amount <= 0
			) {
				throw new BadRequestException('Rent amount must be greater than zero')
			}

			if (dto.start_date && dto.end_date) {
				const startDate = new Date(dto.start_date)
				const endDate = new Date(dto.end_date)
				if (
					Number.isNaN(startDate.getTime()) ||
					Number.isNaN(endDate.getTime())
				) {
					throw new BadRequestException('Invalid lease date format')
				}
				if (endDate <= startDate) {
					throw new BadRequestException('End date must be after start date')
				}
			}

			// RACE CONDITION FIX: Check for existing active lease before creating new one
			// This prevents duplicate leases for the same tenant+unit combination
			const { data: existingLease } = await client
				.from('leases')
				.select('id, lease_status')
				.eq('primary_tenant_id', dto.primary_tenant_id)
				.eq('unit_id', dto.unit_id)
				.not('lease_status', 'in', '("ended","terminated")')
				.maybeSingle()

			if (existingLease) {
				this.logger.warn('Attempted to create duplicate active lease', {
					existing_lease_id: existingLease.id,
					existing_lease_status: existingLease.lease_status,
					tenant_id: dto.primary_tenant_id,
					unit_id: dto.unit_id
				})
				throw new BadRequestException(
					`An active lease already exists for this tenant and unit (status: ${existingLease.lease_status}). Please end or terminate the existing lease before creating a new one.`
				)
			}

			// Extract owner_user_id from property relation with type safety
			type PropertyWithOwner = {
				name: string | null
				owner_user_id: string | null
			} | null
			const property: PropertyWithOwner = unit.property
			if (!property?.owner_user_id) {
				throw new BadRequestException('Property owner not found')
			}

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

			if (
				dtoWithDetails.property_built_before_1978 &&
				dtoWithDetails.lead_paint_disclosure_acknowledged !== true
			) {
				throw new BadRequestException(
					'Lead paint disclosure acknowledgment required for properties built before 1978'
				)
			}

			const resolvedLeaseStatus =
				dto.lease_status !== undefined
					? validateLeaseStatus(dto.lease_status)
					: 'draft'

			const insertData: LeaseInsert = {
				primary_tenant_id: dto.primary_tenant_id,
				unit_id: dto.unit_id,
				owner_user_id: property.owner_user_id,
				start_date: dto.start_date!,
				end_date: dto.end_date || '',
				rent_amount: dto.rent_amount!,
				security_deposit: dto.security_deposit || 0,
				lease_status:
					resolvedLeaseStatus as LeaseStatus,
				payment_day: dto.payment_day ?? 1,
				rent_currency: dto.rent_currency || 'USD',
				grace_period_days: dto.grace_period_days ?? null,
				late_fee_amount: dto.late_fee_amount ?? null,
				late_fee_days: dto.late_fee_days ?? null,
				auto_pay_enabled: dto.auto_pay_enabled ?? false
			}

			// Add lease detail fields if provided (wizard flow)
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

		const updated_data: LeaseUpdate = {
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

	/**
	 * Get complete lease data required for PDF generation
	 * Includes lease, property, unit, landlord, tenant with all relations
	 */
	async getLeaseDataForPdf(
		token: string,
		leaseId: string
	): Promise<{
		lease: Lease
		property: Property
		unit: Unit
		landlord: User
		tenant: User
		tenantRecord: Tenant
	}> {
		// RLS SECURITY: User-scoped client automatically validates ownership
		const client = this.supabase.getUserClient(token)

		// Get lease with full relations in parallel for performance
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(
				`
				*,
				unit:units!leases_unit_id_fkey (
					*,
					property:properties!units_property_id_fkey (*)
				),
				tenant:tenants!leases_primary_tenant_id_fkey (
					*,
					user:users!tenants_user_id_fkey (*)
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Get landlord user (owner_user_id references auth.users.id)
		const { data: landlord, error: landlordError } = await client
			.from('users')
			.select('*')
			.eq('id', lease.owner_user_id)
			.single()

		if (landlordError || !landlord) {
			throw new NotFoundException('Landlord not found')
		}

		// Extract nested relations
		const unit = lease.unit as Unit & {
			property: Property
		}

		const tenantRecord =
			lease.tenant as Tenant & {
				user: User
			}

		if (!unit?.property) {
			throw new NotFoundException('Property not found for lease')
		}

		if (!tenantRecord?.user) {
			throw new NotFoundException('Tenant user not found')
		}

		return {
			lease,
			property: unit.property,
			unit,
			landlord,
			tenant: tenantRecord.user,
			tenantRecord
		}
	}
}
