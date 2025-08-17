import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestWithRelations } from './maintenance-request-supabase.repository'
import {
	CreateMaintenanceRequestDto,
	createMaintenanceRequestSchema,
	MaintenanceRequestQueryDto,
	queryMaintenanceRequestsSchema,
	UpdateMaintenanceRequestDto,
	updateMaintenanceRequestSchema,
	uuidSchema
} from '../common/dto/dto-exports'
import {
	ZodBody,
	ZodParam,
	ZodQuery,
	ZodValidation
} from '../common/decorators/zod-validation.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'

@ApiTags('maintenance-requests')
@Controller('maintenance-requests')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new maintenance request' })
	@ApiResponse({
		status: 201,
		description: 'Maintenance request created successfully'
	})
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'maintenanceRequests', action: 'create' })
	@ZodBody(createMaintenanceRequestSchema)
	async create(
		@Body() data: CreateMaintenanceRequestDto,
		@CurrentUser() user: ValidatedUser
	): Promise<MaintenanceRequestWithRelations> {
		return this.maintenanceService.create(data, user.id)
	}

	@Get()
	@ApiOperation({
		summary: 'Get maintenance requests for the authenticated user'
	})
	@ApiResponse({
		status: 200,
		description: 'Maintenance requests retrieved successfully'
	})
	@ZodQuery(queryMaintenanceRequestsSchema)
	async findAll(
		@Query() query: MaintenanceRequestQueryDto,
		@CurrentUser() user: ValidatedUser
	): Promise<MaintenanceRequestWithRelations[]> {
		return this.maintenanceService.getByOwner(user.id, query)
	}

	@Get('stats')
	@ApiOperation({
		summary: 'Get maintenance request statistics for the authenticated user'
	})
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.maintenanceService.getStats(user.id)
	}

	@Get('by-unit/:unitId')
	@ApiOperation({ summary: 'Get maintenance requests for a specific unit' })
	@ApiParam({ name: 'unitId', description: 'Unit ID' })
	@ApiResponse({
		status: 200,
		description: 'Maintenance requests retrieved successfully'
	})
	@ZodValidation({
		params: uuidSchema,
		query: queryMaintenanceRequestsSchema
	})
	async getMaintenanceRequestsByUnit(
		@Param('unitId') unitId: string,
		@CurrentUser() user: ValidatedUser,
		@Query() query: MaintenanceRequestQueryDto
	): Promise<MaintenanceRequestWithRelations[]> {
		return this.maintenanceService.getByUnit(unitId, user.id, query)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific maintenance request by ID' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({
		status: 200,
		description: 'Maintenance request retrieved successfully'
	})
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@ZodParam(uuidSchema)
	async findOne(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<MaintenanceRequestWithRelations> {
		return this.maintenanceService.findById(id, user.id)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a maintenance request' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({
		status: 200,
		description: 'Maintenance request updated successfully'
	})
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@ZodValidation({
		params: uuidSchema,
		body: updateMaintenanceRequestSchema
	})
	async update(
		@Param('id') id: string,
		@Body() data: UpdateMaintenanceRequestDto,
		@CurrentUser() user: ValidatedUser
	): Promise<MaintenanceRequestWithRelations> {
		return this.maintenanceService.update(id, data, user.id)
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a maintenance request' })
	@ApiParam({ name: 'id', description: 'Maintenance request ID' })
	@ApiResponse({
		status: 200,
		description: 'Maintenance request deleted successfully'
	})
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@ZodParam(uuidSchema)
	async remove(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<void> {
		return this.maintenanceService.delete(id, user.id)
	}
}
