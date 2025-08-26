/**
 * 🚨 ULTRA-NATIVE SERVICE - DO NOT ADD ORCHESTRATION 🚨
 *
 * This file implements DIRECT PostgreSQL RPC calls ONLY:
 * ✅ Single RPC call per method (<30 lines each)
 * ✅ Direct Supabase client calls with automatic RLS
 * ✅ Native NestJS exception handling only
 *
 * ❌ FORBIDDEN: Service orchestration, repositories, query builders
 * ❌ FORBIDDEN: Custom error handlers, response formatters, data mappers
 * ❌ FORBIDDEN: Business logic layers, validation services, helper methods
 *
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '../schemas/units.schema'

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get all units for a user using RPC
	 */
	async findAll(userId: string, query: Record<string, unknown>) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_units', {
				p_user_id: userId,
				p_property_id: query.propertyId as string | undefined,
				p_status: query.status as string | undefined,
				p_search: query.search as string | undefined,
				p_limit: query.limit as number | undefined,
				p_offset: query.offset as number | undefined,
				p_sort_by: query.sortBy as string | undefined,
				p_sort_order: query.sortOrder as string | undefined
			})

		if (error) {
			this.logger.error('Failed to get units', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve units')
		}

		return data
	}

	/**
	 * Get unit statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_unit_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get unit stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve unit statistics')
		}

		return data
	}

	/**
	 * Get units by property using RPC
	 */
	async findByProperty(userId: string, propertyId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_units', {
				p_user_id: userId,
				p_property_id: propertyId
			})

		if (error) {
			this.logger.error('Failed to get property units', {
				userId,
				propertyId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve property units')
		}

		return data
	}

	/**
	 * Get single unit using RPC
	 */
	async findOne(userId: string, unitId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_unit_by_id', {
				p_user_id: userId,
				p_unit_id: unitId
			})
			.single()

		if (error) {
			this.logger.error('Failed to get unit', {
				userId,
				unitId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Create unit using RPC
	 */
	async create(userId: string, createRequest: CreateUnitRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_unit', {
				p_user_id: userId,
				p_property_id: createRequest.propertyId,
				p_unit_number: createRequest.unitNumber,
				p_bedrooms: createRequest.bedrooms,
				p_bathrooms: createRequest.bathrooms,
				p_square_feet: createRequest.squareFeet || undefined,
				p_rent: createRequest.rent,
				p_status: createRequest.status || 'VACANT'
			})
			.single()

		if (error) {
			this.logger.error('Failed to create unit', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to create unit')
		}

		return data
	}

	/**
	 * Update unit using RPC
	 */
	async update(
		userId: string,
		unitId: string,
		updateRequest: UpdateUnitRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_unit', {
				p_user_id: userId,
				p_unit_id: unitId,
				p_unit_number: updateRequest.unitNumber,
				p_bedrooms: updateRequest.bedrooms,
				p_bathrooms: updateRequest.bathrooms,
				p_square_feet: updateRequest.squareFeet,
				p_rent: updateRequest.rent,
				p_status: updateRequest.status
			})
			.single()

		if (error) {
			this.logger.error('Failed to update unit', {
				userId,
				unitId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Delete unit using RPC
	 */
	async remove(userId: string, unitId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_unit', {
				p_user_id: userId,
				p_unit_id: unitId
			})

		if (error) {
			this.logger.error('Failed to delete unit', {
				userId,
				unitId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete unit')
		}
	}
}
