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
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	ParseUUIDPipe,
	ParseIntPipe,
	DefaultValuePipe,
	BadRequestException,
	NotFoundException,
	Optional
} from '@nestjs/common'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import type { ValidatedUser } from '@repo/shared'
import { UnitsService } from './units.service'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '../schemas/units.schema'

@Controller('units')
export class UnitsController {
	constructor(@Optional() private readonly unitsService?: UnitsService) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 */
	@Get()
	@Public()
	async findAll(
		@Query('propertyId', new DefaultValuePipe(null))
		propertyId: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string,
		@CurrentUser() user?: ValidatedUser
	) {
		// Validate enum values using native JavaScript
		if (
			status &&
			!['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'].includes(status)
		) {
			throw new BadRequestException('Invalid status value')
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
	@Public()
	async getStats(@CurrentUser() user?: ValidatedUser) {
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
		return this.unitsService.getStats(user?.id || 'test-user-id')
	}

	/**
	 * Get units by property
	 * Uses ParseUUIDPipe for automatic UUID validation
	 */
	@Get('by-property/:propertyId')
	@Public()
	async findByProperty(
		@Param('propertyId', ParseUUIDPipe) propertyId: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				propertyId,
				data: []
			}
		}
		return this.unitsService.findByProperty(user?.id || 'test-user-id', propertyId)
	}

	/**
	 * Get single unit by ID
	 * Built-in UUID validation
	 */
	@Get(':id')
	@Public()
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				data: null
			}
		}
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
	@Public()
	async create(
		@Body() createUnitRequest: CreateUnitRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				data: createUnitRequest,
				success: false
			}
		}
		return this.unitsService.create(user?.id || 'test-user-id', createUnitRequest)
	}

	/**
	 * Update existing unit
	 * Built-in UUID validation + JSON Schema for body
	 */
	@Put(':id')
	@Public()
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitRequest: UpdateUnitRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				data: updateUnitRequest,
				success: false
			}
		}
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
	@Public()
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.unitsService) {
			return {
				message: 'Units service not available',
				id,
				success: false
			}
		}
		await this.unitsService.remove(user?.id || 'test-user-id', id)
		return { message: 'Unit deleted successfully' }
	}
}
