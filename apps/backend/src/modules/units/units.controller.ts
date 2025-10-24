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
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { UnitsService } from './units.service'

@Controller('units')
export class UnitsController {
	// Logger available if needed for debugging
	// private readonly logger = new Logger(UnitsController.name)

	constructor(private readonly unitsService: UnitsService) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 */
	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('propertyId', new DefaultValuePipe(null))
		propertyId: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string
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

		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		return this.unitsService.findAll(userId, {
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
	async getStats(@Req() req: AuthenticatedRequest) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		return this.unitsService.getStats(userId)
	}

	/**
	 * Get units by property
	 * Uses ParseUUIDPipe for automatic UUID validation
	 */
	@Get('by-property/:propertyId')
	async findByProperty(
		@Req() req: AuthenticatedRequest,
		@Param('propertyId', ParseUUIDPipe) propertyId: string
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		return this.unitsService.findByProperty(userId, propertyId)
	}

	/**
	 * Get single unit by ID
	 * Built-in UUID validation
	 */
	@Get(':id')
	async findOne(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		const unit = await this.unitsService.findOne(userId, id)
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
		@Req() req: AuthenticatedRequest,
		@Body() createUnitRequest: CreateUnitRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		return this.unitsService.create(userId, createUnitRequest)
	}

	/**
	 * Update existing unit
	 * Built-in UUID validation + JSON Schema for body
	 */
	@Put(':id')
	async update(
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitRequest: UpdateUnitRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		const unit = await this.unitsService.update(userId, id, updateUnitRequest)
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
		@Req() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		await this.unitsService.remove(userId, id)
		return { message: 'Unit deleted successfully' }
	}
}
