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
	UsePipes,
	ValidationPipe,
	ParseUUIDPipe
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { UnitsService, UnitWithRelations } from './units.service'
import { UnitCreateDto, UnitUpdateDto } from './dto'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Units controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('units')
@Controller('units')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all units for current user' })
	@ApiResponse({ status: 200, description: 'Units retrieved successfully' })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string
	): Promise<ControllerApiResponse<UnitWithRelations[]>> {
		const data = await this.unitsService.findAll(user.id, propertyId)
		return {
			success: true,
			data,
			message: 'Units retrieved successfully'
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get unit statistics' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.unitsService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully'
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search units' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@Query('propertyId') propertyId: string | undefined,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitWithRelations[]>> {
		const data = await this.unitsService.search(user.id, searchTerm || '', propertyId)
		return {
			success: true,
			data,
			message: 'Search completed successfully'
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get unit by ID' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitWithRelations>> {
		const data = await this.unitsService.findOne(id, user.id)
		return {
			success: true,
			data,
			message: 'Unit retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new unit' })
	@ApiResponse({ status: 201, description: 'Unit created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'units', action: 'create' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createUnitDto: UnitCreateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitWithRelations>> {
		const data = await this.unitsService.create(createUnitDto, user.id)
		return {
			success: true,
			data,
			message: 'Unit created successfully'
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update unit' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitDto: UnitUpdateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitWithRelations>> {
		const data = await this.unitsService.update(id, updateUnitDto, user.id)
		return {
			success: true,
			data,
			message: 'Unit updated successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete unit' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit deleted successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@ApiResponse({ status: 400, description: 'Cannot delete unit with active leases' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.unitsService.remove(id, user.id)
		return {
			success: true,
			message: 'Unit deleted successfully'
		}
	}

	@Put(':id/status')
	@ApiOperation({ summary: 'Update unit status' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit status updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	@ApiResponse({ status: 400, description: 'Invalid status or business rule violation' })
	async updateStatus(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('status') status: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitWithRelations>> {
		const data = await this.unitsService.updateStatus(id, status, user.id)
		return {
			success: true,
			data,
			message: 'Unit status updated successfully'
		}
	}
}