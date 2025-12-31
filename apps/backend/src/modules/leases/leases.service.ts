/**
 * Leases Service - Core Mutation Operations
 *
 * Handles: create, update, remove
 * Query operations delegated to LeaseQueryService (used directly by controllers)
 *
 * - NO ABSTRACTIONS: Service delegates to Supabase directly
 * - KISS: Simple, focused service methods
 * - DRY: Supabase handles data access logic
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type { CreateLeaseDto } from './dto/create-lease.dto'
import type { UpdateLeaseDto } from './dto/update-lease.dto'
import type { Lease, LeaseStatus } from '@repo/shared/types/core'
import type { LeaseInsert, LeaseUpdate } from '@repo/shared/types/api-contracts'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
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
	 * Create lease
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async create(token: string, dto: CreateLeaseDto): Promise<Lease> {
		if (!token || !dto.unit_id || !dto.primary_tenant_id) {
			this.logger.warn('Create lease called with missing parameters', { dto })
			throw new BadRequestException(
				'Authentication token, unit ID, and primary tenant ID are required'
			)
		}

		this.logger.log('Creating lease via RLS-protected query', { dto })

		const client = this.supabase.getUserClient(token)

		const { error: assertError } = await client.rpc('assert_can_create_lease', {
			p_unit_id: dto.unit_id,
			p_primary_tenant_id: dto.primary_tenant_id
		})

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

		if (dto.rent_amount !== undefined && dto.rent_amount !== null && dto.rent_amount <= 0) {
			throw new BadRequestException('Rent amount must be greater than zero')
		}

		if (dto.start_date && dto.end_date) {
			const startDate = new Date(dto.start_date)
			const endDate = new Date(dto.end_date)
			if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
				throw new BadRequestException('Invalid lease date format')
			}
			if (endDate <= startDate) {
				throw new BadRequestException('End date must be after start date')
			}
		}

		// RACE CONDITION FIX: Check for existing active lease
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
				`An active lease already exists for this tenant and unit (status: ${existingLease.lease_status}).`
			)
		}

		type PropertyWithOwner = { name: string | null; owner_user_id: string | null } | null
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

		if (dtoWithDetails.property_built_before_1978 && dtoWithDetails.lead_paint_disclosure_acknowledged !== true) {
			throw new BadRequestException('Lead paint disclosure acknowledgment required for properties built before 1978')
		}

		const resolvedLeaseStatus = dto.lease_status !== undefined ? validateLeaseStatus(dto.lease_status) : 'draft'

		const insertData: LeaseInsert = {
			primary_tenant_id: dto.primary_tenant_id,
			unit_id: dto.unit_id,
			owner_user_id: property.owner_user_id,
			start_date: dto.start_date!,
			end_date: dto.end_date || '',
			rent_amount: dto.rent_amount!,
			security_deposit: dto.security_deposit || 0,
			lease_status: resolvedLeaseStatus as LeaseStatus,
			payment_day: dto.payment_day ?? 1,
			rent_currency: dto.rent_currency || 'USD',
			grace_period_days: dto.grace_period_days ?? null,
			late_fee_amount: dto.late_fee_amount ?? null,
			late_fee_days: dto.late_fee_days ?? null,
			auto_pay_enabled: dto.auto_pay_enabled ?? false
		}

		// Add lease detail fields if provided (wizard flow)
		if (dtoWithDetails.max_occupants !== undefined) insertData.max_occupants = dtoWithDetails.max_occupants
		if (dtoWithDetails.pets_allowed !== undefined) insertData.pets_allowed = dtoWithDetails.pets_allowed
		if (dtoWithDetails.pet_deposit !== undefined) insertData.pet_deposit = dtoWithDetails.pet_deposit
		if (dtoWithDetails.pet_rent !== undefined) insertData.pet_rent = dtoWithDetails.pet_rent
		if (dtoWithDetails.utilities_included !== undefined) insertData.utilities_included = dtoWithDetails.utilities_included
		if (dtoWithDetails.tenant_responsible_utilities !== undefined) insertData.tenant_responsible_utilities = dtoWithDetails.tenant_responsible_utilities
		if (dtoWithDetails.property_rules !== undefined) insertData.property_rules = dtoWithDetails.property_rules
		if (dtoWithDetails.property_built_before_1978 !== undefined) insertData.property_built_before_1978 = dtoWithDetails.property_built_before_1978
		if (dtoWithDetails.lead_paint_disclosure_acknowledged !== undefined) insertData.lead_paint_disclosure_acknowledged = dtoWithDetails.lead_paint_disclosure_acknowledged
		if (dtoWithDetails.governing_state !== undefined) insertData.governing_state = dtoWithDetails.governing_state

		const { data, error } = await client.from('leases').insert(insertData).select().single()

		if (error) {
			this.logger.error('Failed to create lease in Supabase', { error: error.message, dto })
			throw new BadRequestException('Failed to create lease')
		}

		return data as Lease
	}

	/**
	 * Update lease
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async update(token: string, lease_id: string, updateRequest: UpdateLeaseDto): Promise<Lease> {
		if (!token || !lease_id) {
			this.logger.warn('Update lease called with missing parameters', { lease_id })
			throw new BadRequestException('Authentication token and lease ID are required')
		}

		this.logger.log('Updating lease via RLS-protected query', { lease_id, updateRequest })

		// RLS COMPLIANT: RLS policies automatically verify ownership
		const client = this.supabase.getUserClient(token)

		const updated_data: LeaseUpdate = { updated_at: new Date().toISOString() }

		if (updateRequest.start_date !== undefined) updated_data.start_date = updateRequest.start_date
		if (updateRequest.end_date !== undefined) updated_data.end_date = updateRequest.end_date
		if (updateRequest.rent_amount !== undefined && updateRequest.rent_amount !== null) updated_data.rent_amount = updateRequest.rent_amount
		if (updateRequest.security_deposit !== undefined && updateRequest.security_deposit !== null) updated_data.security_deposit = updateRequest.security_deposit
		if (updateRequest.lease_status !== undefined) updated_data.lease_status = updateRequest.lease_status

		const { data, error } = await client.from('leases').update(updated_data).eq('id', lease_id).select().single()

		if (error || !data) {
			if (error?.code === 'PGRST116' || !data) {
				this.logger.warn('Lease not found or access denied', { lease_id })
				throw new NotFoundException('Lease not found')
			}
			this.logger.error('Failed to update lease in Supabase', { error: error ? String(error) : 'Unknown error', lease_id, updateRequest })
			throw new BadRequestException('Failed to update lease')
		}

		return data as Lease
	}

	/**
	 * Remove lease (hard delete)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically validates ownership
	 */
	async remove(token: string, lease_id: string): Promise<void> {
		if (!token || !lease_id) {
			this.logger.warn('Remove lease called with missing parameters', { lease_id })
			throw new BadRequestException('Authentication token and lease ID are required')
		}

		this.logger.log('Removing lease via RLS-protected query', { lease_id })

		// RLS COMPLIANT: RLS policies automatically verify ownership
		const client = this.supabase.getUserClient(token)
		
		// First check if lease exists to provide better error messages
		const { data: existingLease, error: fetchError } = await client
			.from('leases')
			.select('id')
			.eq('id', lease_id)
			.single()

		if (fetchError || !existingLease) {
			this.logger.warn('Lease not found or access denied', { lease_id })
			throw new NotFoundException('Lease not found')
		}

		const { error } = await client.from('leases').delete().eq('id', lease_id)

		if (error) {
			this.logger.error('Failed to delete lease in Supabase', { error: error.message, lease_id })
			throw new BadRequestException('Failed to delete lease')
		}
	}
}
