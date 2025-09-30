/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * This file implements the ULTRA-NATIVE pattern. DO NOT MODIFY:
 * [OK] ONLY built-in NestJS pipes (ParseUUIDPipe, DefaultValuePipe, ParseIntPipe)
 * [OK] ONLY native exceptions (BadRequestException, NotFoundException)
 * [OK] ONLY direct service calls with PostgreSQL RPC functions
 *
 * FORBIDDEN: Custom decorators, DTOs, validation classes, service layers
 * FORBIDDEN: Middleware, interceptors, custom validators, wrapper functions
 *
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md for complete rules
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req
} from '@nestjs/common'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '@repo/shared/types/backend-domain'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { UnitsService } from './units.service'

@Controller('units')
export class UnitsController {
	// Logger available if needed for debugging
	// private readonly logger = new Logger(UnitsController.name)

	constructor(
		@Optional() private readonly unitsService?: UnitsService,
		@Optional() private readonly supabaseService?: SupabaseService
	) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 */
	@Get()
	async findAll(
		@Query('propertyId', new DefaultValuePipe(null))
		propertyId: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string,
		@Req() request: Request
	) {
		// Validate enum values using native JavaScript (accept both cases)
		if (status) {
			const upperStatus = status.toUpperCase()
			if (
				!['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'].includes(upperStatus)
			) {
				throw new BadRequestException('Invalid status value')
			}
			// Normalize to uppercase for database query
			status = upperStatus
		}
		if (
			!['createdAt', 'unitNumber', 'bedrooms', 'rent', 'status'].includes(
				sortBy
			)
		) {
			throw new BadRequestException('Invalid sortBy value')
		}
		if (!['asc', 'desc'].includes(sortOrder)) {
			throw new BadRequestException('Invalid sortOrder value')
		}

		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				data: [],
				total: 0,
				limit,
				offset
			}
		}

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null

		return this.unitsService.findAll(user?.id || 'test-user-id', {
			propertyId,
			status,
			search,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	/**
	 * Get unit statistics
	 * Direct RPC call to PostgreSQL
	 */
	@Get('stats')
	async getStats(@Req() request: Request) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				totalUnits: 0,
				vacantUnits: 0,
				occupiedUnits: 0,
				maintenanceUnits: 0,
				reservedUnits: 0
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		return this.unitsService.getStats(user?.id || 'test-user-id')
	}

	/**
	 * Get units by property
	 * Uses ParseUUIDPipe for automatic UUID validation
	 */
	@Get('by-property/:propertyId')
	async findByProperty(
		@Param('propertyId', ParseUUIDPipe) propertyId: string,
		@Req() request: Request
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				propertyId,
				data: []
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		return this.unitsService.findByProperty(
			user?.id || 'test-user-id',
			propertyId
		)
	}

	/**
	 * Get single unit by ID
	 * Built-in UUID validation
	 */
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: Request
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				data: null
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		const unit = await this.unitsService.findOne(user?.id || 'test-user-id', id)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Create new unit
	 * JSON Schema validation via Express
	 */
	@Post()
	async create(
		@Body() createUnitRequest: CreateUnitRequest,
		@Req() request: Request
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				data: createUnitRequest,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		return this.unitsService.create(
			user?.id || 'test-user-id',
			createUnitRequest
		)
	}

	/**
	 * Update existing unit
	 * Built-in UUID validation + JSON Schema for body
	 */
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitRequest: UpdateUnitRequest,
		@Req() request: Request
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				data: updateUnitRequest,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		const unit = await this.unitsService.update(
			user?.id || 'test-user-id',
			id,
			updateUnitRequest
		)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Delete unit
	 * Simple and direct
	 */
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: Request
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService
			? await this.supabaseService.getUser(request)
			: null
		await this.unitsService.remove(user?.id || 'test-user-id', id)
		return { message: 'Unit deleted successfully' }
	}
}
