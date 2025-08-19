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
import { MaintenanceService, MaintenanceRequestWithRelations, MaintenanceRequestQueryOptions } from './maintenance.service'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from '../common/dto/dto-exports'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Maintenance controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('maintenance-requests')
@Controller('maintenance-requests')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Get()
	@ApiOperation({ summary: 'Get all maintenance requests for current user' })
	@ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
	async findAll(
		@Query() query: MaintenanceRequestQueryOptions,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations[]>> {
		const data = await this.maintenanceService.findAll(user.id, query)
		return {
			success: true,
			data,
			message: 'Maintenance requests retrieved successfully'
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get maintenance request statistics' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.maintenanceService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully'
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search maintenance requests' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations[]>> {
		const data = await this.maintenanceService.search(user.id, searchTerm || '')
		return {
			success: true,
			data,
			message: 'Search completed successfully'
		}
	}

	@Get('by-unit/:unitId')
	@ApiOperation({ summary: 'Get maintenance requests for a specific unit' })
	@ApiParam({ name: 'unitId', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
	async getMaintenanceRequestsByUnit(
		@Param('unitId', ParseUUIDPipe) unitId: string,
		@Query() query: MaintenanceRequestQueryOptions,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations[]>> {
		const data = await this.maintenanceService.findByUnit(unitId, user.id, query)
		return {
			success: true,
			data,
			message: 'Maintenance requests retrieved successfully'
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get maintenance request by ID' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({ status: 200, description: 'Maintenance request retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.findOne(id, user.id)
		return {
			success: true,
			data,
			message: 'Maintenance request retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new maintenance request' })
	@ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'maintenanceRequests', action: 'create' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createMaintenanceRequestDto: CreateMaintenanceRequestDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.create(createMaintenanceRequestDto, user.id)
		return {
			success: true,
			data,
			message: 'Maintenance request created successfully'
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update maintenance request' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({ status: 200, description: 'Maintenance request updated successfully' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.update(id, updateMaintenanceRequestDto, user.id)
		return {
			success: true,
			data,
			message: 'Maintenance request updated successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete maintenance request' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({ status: 200, description: 'Maintenance request deleted successfully' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.maintenanceService.remove(id, user.id)
		return {
			success: true,
			message: 'Maintenance request deleted successfully'
		}
	}
}