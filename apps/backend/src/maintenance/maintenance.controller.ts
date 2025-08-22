import {
	Body,
	Controller,
	Delete,
	Get,
	Logger,
	Param,
	Patch,
	Post,
	Query,
	UseGuards
} from '@nestjs/common'
import { MaintenanceCreateDto, MaintenanceQueryDto, MaintenanceService, MaintenanceUpdateDto } from './maintenance.service'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { createSuccessResponse } from '../shared/utils/api-response'

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
	private readonly logger = new Logger(MaintenanceController.name)

	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Post()
	async create(
		@Body() createMaintenanceDto: MaintenanceCreateDto,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Creating maintenance request for user ${user.id}`)
		
		const maintenanceRequest = await this.maintenanceService.create(
			user.id,
			createMaintenanceDto
		)

		return createSuccessResponse(
			maintenanceRequest,
			'Maintenance request created successfully'
		)
	}

	@Get()
	async findAll(
		@Query() query: MaintenanceQueryDto,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Fetching maintenance requests for user ${user.id}`)
		
		const maintenanceRequests = await this.maintenanceService.findAll(
			user.id,
			query
		)

		return createSuccessResponse(
			maintenanceRequests,
			'Maintenance requests retrieved successfully'
		)
	}

	@Get(':id')
	async findOne(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Fetching maintenance request ${id} for user ${user.id}`)
		
		const maintenanceRequest = await this.maintenanceService.findOne(id, user.id)

		return createSuccessResponse(
			maintenanceRequest,
			'Maintenance request retrieved successfully'
		)
	}

	@Patch(':id')
	async update(
		@Param('id') id: string,
		@Body() updateMaintenanceDto: MaintenanceUpdateDto,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Updating maintenance request ${id} for user ${user.id}`)
		
		const maintenanceRequest = await this.maintenanceService.update(
			id,
			user.id,
			updateMaintenanceDto
		)

		return createSuccessResponse(
			maintenanceRequest,
			'Maintenance request updated successfully'
		)
	}

	@Delete(':id')
	async remove(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		this.logger.log(`Deleting maintenance request ${id} for user ${user.id}`)
		
		await this.maintenanceService.remove(id, user.id)

		return createSuccessResponse(
			null,
			'Maintenance request deleted successfully'
		)
	}
}