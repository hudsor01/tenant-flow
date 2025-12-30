/**
 * Units Controller

 * Per CLAUDE.md:
 * - Uses nestjs-zod DTOs for validation (native to NestJS ecosystem)
 * - Uses @JwtToken() custom decorator for authentication (per CLAUDE.md Backend section)
 * - Uses RLS-protected Supabase queries via service layer
 * - Global ZodValidationPipe handles validation automatically
 */

import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query
} from '@nestjs/common'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { UnitsService } from './units.service'
import { UnitStatsService } from './services/unit-stats.service'
import { UnitQueryService } from './services/unit-query.service'
import { FindAllUnitsDto } from './dto/find-all-units.dto'

@Controller('units')
export class UnitsController {
	constructor(
		private readonly unitsService: UnitsService,
		private readonly unitStatsService: UnitStatsService,
		private readonly unitQueryService: UnitQueryService
	) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@SkipSubscriptionCheck()
	@Get()
	async findAll(@JwtToken() token: string, @Query() query: FindAllUnitsDto) {
		// DTO validation handled by ZodValidationPipe - no manual validation needed
		// Normalize status to lowercase for database enum
		const normalizedQuery = {
			...query,
			status: query.status?.toLowerCase() as typeof query.status
		}

		const data = await this.unitQueryService.findAll(token, normalizedQuery)

		// Return PaginatedResponse format expected by frontend
		return {
			data,
			total: data.length,
			limit: query.limit,
			offset: query.offset,
			hasMore: data.length >= query.limit
		}
	}

	/**
	 * Get unit statistics
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('stats')
	async getStats(@JwtToken() token: string) {
		return this.unitStatsService.getStats(token)
	}

	/**
	 * Get units by property
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('by-property/:property_id')
	async findByProperty(
		@JwtToken() token: string,
		@Param('property_id', ParseUUIDPipe) property_id: string
	) {
		return this.unitQueryService.findByProperty(token, property_id)
	}

	/**
	 * Get single unit by ID
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get(':id')
	async findOne(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const unit = await this.unitQueryService.findOne(token, id)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Create new unit
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post()
	async create(
		@JwtToken() token: string,
		@Body() createUnitDto: CreateUnitDto
	) {
		return this.unitsService.create(token, createUnitDto)
	}

	/**
	 * Update existing unit
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Put(':id')
	async update(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitDto: UpdateUnitDto
	) {
		//Pass version for optimistic locking
		const expectedVersion = (updateUnitDto as { version?: number }).version
		const unit = await this.unitsService.update(
			token,
			id,
			updateUnitDto,
			expectedVersion
		)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Delete unit
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Delete(':id')
	async remove(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.unitsService.remove(token, id)
		return { message: 'Unit deleted successfully' }
	}
}
