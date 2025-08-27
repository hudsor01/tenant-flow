/**
 * 🚨 ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS 🚨
 *
 * This file implements the ULTRA-NATIVE pattern. DO NOT MODIFY:
 * ✅ ONLY built-in NestJS pipes (ParseUUIDPipe, DefaultValuePipe, ParseIntPipe)
 * ✅ ONLY native exceptions (BadRequestException, NotFoundException)
 * ✅ ONLY direct service calls with PostgreSQL RPC functions
 *
 * ❌ FORBIDDEN: Custom decorators, DTOs, validation classes, service layers
 * ❌ FORBIDDEN: Middleware, interceptors, custom validators, wrapper functions
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
	UseGuards,
	ParseUUIDPipe,
	ParseIntPipe,
	DefaultValuePipe,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '@repo/shared'
import { UnitsService } from './units.service'
import type {
	CreateUnitRequest,
	UpdateUnitRequest
} from '../schemas/units.schema'

@Controller('units')
@UseGuards(ThrottlerGuard, AuthGuard)
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 */
	@Get()
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId', new DefaultValuePipe(null))
		propertyId: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string
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

		return this.unitsService.findAll(user.id, {
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
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.unitsService.getStats(user.id)
	}

	/**
	 * Get units by property
	 * Uses ParseUUIDPipe for automatic UUID validation
	 */
	@Get('by-property/:propertyId')
	async findByProperty(
		@CurrentUser() user: ValidatedUser,
		@Param('propertyId', ParseUUIDPipe) propertyId: string
	) {
		return this.unitsService.findByProperty(user.id, propertyId)
	}

	/**
	 * Get single unit by ID
	 * Built-in UUID validation
	 */
	@Get(':id')
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const unit = await this.unitsService.findOne(user.id, id)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Create new unit
	 * JSON Schema validation via Fastify
	 */
	@Post()
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createUnitRequest: CreateUnitRequest
	) {
		return this.unitsService.create(user.id, createUnitRequest)
	}

	/**
	 * Update existing unit
	 * Built-in UUID validation + JSON Schema for body
	 */
	@Put(':id')
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitRequest: UpdateUnitRequest
	) {
		const unit = await this.unitsService.update(
			user.id,
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
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.unitsService.remove(user.id, id)
		return { message: 'Unit deleted successfully' }
	}
}
