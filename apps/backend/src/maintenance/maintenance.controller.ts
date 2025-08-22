import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
// import { Public } from '../shared/decorators/public.decorator' // Currently unused
import type { ValidatedUser } from '../auth/auth.service'
import { MaintenanceRequestWithRelations, MaintenanceService } from './maintenance.service'
import { MaintenanceCreateDto, MaintenanceQueryDto, MaintenanceUpdateDto } from './dto'
import type { ControllerApiResponse, RequestStatus } from '@repo/shared'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { UsageLimit } from '../shared/decorators/usage-limits.decorator'

/**
 * Maintenance controller - Handles maintenance requests and scheduling
 */
@ApiTags('maintenance')
@Controller('maintenance-requests')
@UseGuards(UnifiedAuthGuard, UsageLimitsGuard)
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Get()
	@ApiOperation({ summary: 'Get all maintenance requests for current user' })
	@ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
	async findAll(
		@Query() query: MaintenanceQueryDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations[]>> {
		const data = await this.maintenanceService.findAll(user.id, query)
		return {
			success: true,
			data,
			message: 'Maintenance requests retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get maintenance statistics' })
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(@CurrentUser() user: ValidatedUser): Promise<ControllerApiResponse> {
		const data = await this.maintenanceService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully',
			timestamp: new Date().toISOString()
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
			message: 'Maintenance request retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new maintenance request' })
	@ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ feature: 'maintenance-requests' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createMaintenanceDto: MaintenanceCreateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.create(createMaintenanceDto, user.id)
		return {
			success: true,
			data,
			message: 'Maintenance request created successfully',
			timestamp: new Date().toISOString()
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
		@Body() updateMaintenanceDto: MaintenanceUpdateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.update(
			id,
			updateMaintenanceDto,
			user.id
		)
		return {
			success: true,
			data,
			message: 'Maintenance request updated successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Put(':id/status')
	@ApiOperation({ summary: 'Update maintenance request status' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({ status: 200, description: 'Status updated successfully' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	async updateStatus(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('status') status: RequestStatus,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<MaintenanceRequestWithRelations>> {
		const data = await this.maintenanceService.updateStatus(id, status, user.id)
		return {
			success: true,
			data,
			message: 'Status updated successfully',
			timestamp: new Date().toISOString()
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
			data: null,
			message: 'Maintenance request deleted successfully',
			timestamp: new Date().toISOString()
		}
	}
}