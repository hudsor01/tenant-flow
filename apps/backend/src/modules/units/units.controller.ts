/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, validation layers, middleware
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
	Query,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { UnitsService } from './units.service'
import { UnitStatsService } from './services/unit-stats.service'
import { UnitQueryService } from './services/unit-query.service'
import { FindAllUnitsDto } from './dto/find-all-units.dto'

@ApiTags('Units')
@ApiBearerAuth('supabase-auth')
@Controller('units')
export class UnitsController {
	constructor(
		private readonly unitsService: UnitsService,
		private readonly unitStatsService: UnitStatsService,
		private readonly unitQueryService: UnitQueryService
	) {}

	@ApiOperation({ summary: 'List all units', description: 'Get all units for the authenticated user with filtering and pagination' })
	@ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
	@ApiQuery({ name: 'status', required: false, enum: ['available', 'occupied', 'maintenance', 'reserved'], description: 'Filter by unit status' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiResponse({ status: 200, description: 'List of units with pagination info' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@SkipSubscriptionCheck()
	@Get()
	async findAll(@Request() req: AuthenticatedRequest, @Query() query: FindAllUnitsDto) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		// DTO validation handled by ZodValidationPipe - no manual validation needed
		// Normalize status to lowercase for database enum
		const normalizedQuery = {
			...query,
			status: query.status?.toLowerCase() as typeof query.status
		}

		const { data, count } = await this.unitQueryService.findAll(token, normalizedQuery)

		// Return PaginatedResponse format expected by frontend
		// Use count from Supabase { count: 'exact' } for accurate total
		return {
			data,
			total: count,
			limit: query.limit,
			offset: query.offset,
			hasMore: query.offset + data.length < count
		}
	}

	@ApiOperation({ summary: 'Get unit statistics', description: 'Returns aggregated unit stats (total, vacant, occupied, etc.)' })
	@ApiResponse({ status: 200, description: 'Unit statistics' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stats')
	async getStats(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.unitStatsService.getStats(token)
	}

	@ApiOperation({ summary: 'Get units by property', description: 'Get all units for a specific property' })
	@ApiParam({ name: 'property_id', type: String, description: 'Property UUID' })
	@ApiResponse({ status: 200, description: 'List of units for the property' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('by-property/:property_id')
	async findByProperty(
		@Param('property_id', ParseUUIDPipe) property_id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.unitQueryService.findByProperty(token, property_id)
	}

	@ApiOperation({ summary: 'Get unit by ID', description: 'Get a single unit by its UUID' })
	@ApiParam({ name: 'id', type: String, description: 'Unit UUID' })
	@ApiResponse({ status: 200, description: 'Unit details' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const unit = await this.unitQueryService.findOne(token, id)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	@ApiOperation({ summary: 'Create unit', description: 'Create a new unit for a property' })
	@ApiBody({ type: CreateUnitDto })
	@ApiResponse({ status: 201, description: 'Unit created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async create(
		@Body() createUnitDto: CreateUnitDto,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.unitsService.create(token, createUnitDto)
	}

	@ApiOperation({ summary: 'Update unit', description: 'Update an existing unit by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Unit UUID' })
	@ApiBody({ type: UpdateUnitDto })
	@ApiResponse({ status: 200, description: 'Unit updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitDto: UpdateUnitDto,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Delete unit', description: 'Delete a unit by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Unit UUID' })
	@ApiResponse({ status: 200, description: 'Unit deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		await this.unitsService.remove(token, id)
		return { message: 'Unit deleted successfully' }
	}
}
