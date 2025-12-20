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
import type { Lease, LeaseStatus } from '@repo/shared/types/core'
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

			// Build single query with relations to avoid N+1 queries in frontend
			// PERFORMANCE FIX: Includes tenant, unit, and property data in single query
			// Eliminates 3 requests → 1 request (200-400ms savings)
			let queryBuilder = client.from('leases').select(`
				*,
				tenant:tenants!primary_tenant_id(
					id,
					full_name,
					email,
					phone,
					user_id
				),
				unit:units!unit_id(
					id,
					unit_number,
					property_id,
					floor,
					bedrooms,
					bathrooms
				),
				property:properties(
					id,
					name,
					address,
					city,
					state,
					zip_code
				)
			`, { count: 'exact' })

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
				queryBuilder = queryBuilder.eq('lease_status', query.status as LeaseStatus)
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
			if (!token) {
				this.logger.warn('Create lease called without token')
				throw new BadRequestException('Authentication token is required')
			}

			const unitId = dto.unit_id
			const tenantId = dto.primary_tenant_id

			if (!unitId) {
				throw new BadRequestException('unit_id is required')
			}
			if (!tenantId) {
				throw new BadRequestException('primary_tenant_id is required')
			}

			const parseDateOnly = (value: string): Date | null => {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
				const date = new Date(`${value}T00:00:00.000Z`)
				if (Number.isNaN(date.getTime())) return null
				const [year, month, day] = value.split('-').map(Number)
				if (
					date.getUTCFullYear() !== year ||
					date.getUTCMonth() + 1 !== month ||
					date.getUTCDate() !== day
				) {
					return null
				}
				return date
			}

			if (!dto.start_date || !dto.end_date) {
				throw new BadRequestException('Start date and end date are required')
			}

			const startDate = parseDateOnly(dto.start_date)
			const endDate = parseDateOnly(dto.end_date)

			if (!startDate || !endDate) {
				throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
			}
			if (endDate <= startDate) {
				throw new BadRequestException('End date must be after start date')
			}

			if (!dto.rent_amount || dto.rent_amount <= 0) {
				throw new BadRequestException('Rent amount must be positive')
			}

			const paymentDay = dto.payment_day ?? 1
			if (paymentDay < 1 || paymentDay > 31) {
				throw new BadRequestException('Payment day must be between 1 and 31')
			}

			const validStatuses: LeaseStatus[] = [
				'draft',
				'pending_signature',
				'active',
				'ended',
				'terminated'
			]
			if (dto.lease_status && !validStatuses.includes(dto.lease_status as LeaseStatus)) {
				throw new BadRequestException('Invalid lease status')
			}
			const leaseStatus = (dto.lease_status as LeaseStatus | undefined) ?? 'draft'

			// Lead paint disclosure requirement
			if (
				dto.property_built_before_1978 === true &&
				dto.lead_paint_disclosure_acknowledged !== true
			) {
				throw new BadRequestException(
					'Lead paint disclosure acknowledgment is required for properties built before 1978'
				)
			}

			this.logger.log('Creating lease via RLS-protected query', { dto })

			// RLS SECURITY: User-scoped client automatically validates unit access + insert permissions
			const client = this.supabase.getUserClient(token)

			// Fetch unit (RLS-protected). If the owner can't see it, they can't create a lease for it.
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('id, owner_user_id, property_id, property:properties(name)')
				.eq('id', unitId)
				.maybeSingle()

			if (unitError) {
				this.logger.warn('Failed to fetch unit during lease creation', {
					error: unitError.message,
					unitId
				})
			}

			if (!unit) {
				throw new BadRequestException('Unit not found or access denied')
			}

			// IMPORTANT: Owners cannot SELECT tenants/users due to RLS.
			// Use a tightly-scoped SECURITY DEFINER RPC to validate:
			// - tenant exists
			// - tenant has an invitation to this unit
			// - invitation is accepted
			// This keeps the write path user-scoped (no service role) while preserving correct access control.
			const { error: inviteError } = await client.rpc('assert_can_create_lease', {
				p_unit_id: unitId,
				p_primary_tenant_id: tenantId
			})

			if (inviteError) {
				throw new BadRequestException(inviteError.message)
			}

			const insertData: Database['public']['Tables']['leases']['Insert'] = {
				primary_tenant_id: tenantId,
				unit_id: unitId,
				owner_user_id: unit.owner_user_id,
				start_date: dto.start_date!, // Validated above
				end_date: dto.end_date!, // Validated above
				rent_amount: dto.rent_amount!, // Validated above
				security_deposit: dto.security_deposit ?? 0,
				lease_status: leaseStatus,
				payment_day: paymentDay,
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
				throw new BadRequestException(error.message)
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

	/**
	 * Get complete lease data required for PDF generation
	 * Includes lease, property, unit, landlord, tenant with all relations
	 */
	async getLeaseDataForPdf(token: string, leaseId: string): Promise<{
		lease: Database['public']['Tables']['leases']['Row']
		property: Database['public']['Tables']['properties']['Row']
		unit: Database['public']['Tables']['units']['Row']
		landlord: Database['public']['Tables']['users']['Row']
		tenant: Database['public']['Tables']['users']['Row']
		tenantRecord: Database['public']['Tables']['tenants']['Row']
	}> {
		// RLS SECURITY: User-scoped client automatically validates ownership
		const client = this.supabase.getUserClient(token)

		// Get lease with full relations in parallel for performance
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(`
				*,
				unit:units!leases_unit_id_fkey (
					*,
					property:properties!units_property_id_fkey (*)
				),
				tenant:tenants!leases_primary_tenant_id_fkey (
					*,
					user:users!tenants_user_id_fkey (*)
				)
			`)
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
		const unit = lease.unit as Database['public']['Tables']['units']['Row'] & {
			property: Database['public']['Tables']['properties']['Row']
		}

		const tenantRecord = lease.tenant as Database['public']['Tables']['tenants']['Row'] & {
			user: Database['public']['Tables']['users']['Row']
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
