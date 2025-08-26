/**
 * 🚨 ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS 🚨
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * ❌ FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
<<<<<<< HEAD
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Query,
	Body,
	HttpStatus,
	ParseUUIDPipe,
	DefaultValuePipe,
	ParseIntPipe,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse
} from '@nestjs/swagger'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '@repo/shared'
import { MaintenanceService } from './maintenance.service'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '../schemas/maintenance.schema'

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
=======
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
>>>>>>> origin/main
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Get()
<<<<<<< HEAD
	@ApiOperation({ summary: 'Get all maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('unitId') unitId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('priority') priority?: string,
		@Query('category') category?: string,
		@Query('status') status?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		// Validate UUIDs if provided
		if (
			unitId &&
			!unitId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid unit ID')
		}
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate enum values
		if (
			priority &&
			!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)
		) {
			throw new BadRequestException('Invalid priority')
		}
		if (
			category &&
			![
				'PLUMBING',
				'ELECTRICAL',
				'HVAC',
				'APPLIANCE',
				'STRUCTURAL',
				'GENERAL',
				'OTHER'
			].includes(category)
		) {
			throw new BadRequestException('Invalid category')
		}
		if (
			status &&
			!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(
				status
			)
		) {
			throw new BadRequestException('Invalid status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		return this.maintenanceService.findAll(user.id, {
			unitId,
			propertyId,
			priority,
			category,
			status,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get maintenance statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.maintenanceService.getStats(user.id)
	}

	@Get('urgent')
	@ApiOperation({ summary: 'Get urgent maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async getUrgent(@CurrentUser() user: ValidatedUser) {
		return this.maintenanceService.getUrgent(user.id)
	}

	@Get('overdue')
	@ApiOperation({ summary: 'Get overdue maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async getOverdue(@CurrentUser() user: ValidatedUser) {
		return this.maintenanceService.getOverdue(user.id)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get maintenance request by ID' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const maintenance = await this.maintenanceService.findOne(user.id, id)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Post()
	@ApiOperation({ summary: 'Create new maintenance request' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createRequest: CreateMaintenanceRequest
	) {
		return this.maintenanceService.create(user.id, createRequest)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update maintenance request' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateMaintenanceRequest
	) {
		const maintenance = await this.maintenanceService.update(
			user.id,
			id,
			updateRequest
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete maintenance request' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.maintenanceService.remove(user.id, id)
	}

	@Post(':id/complete')
	@ApiOperation({ summary: 'Mark maintenance request as completed' })
	@ApiResponse({ status: HttpStatus.OK })
	async complete(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body('actualCost') actualCost?: number,
		@Body('notes') notes?: string
	) {
		if (actualCost && (actualCost < 0 || actualCost > 999999)) {
			throw new BadRequestException(
				'Actual cost must be between 0 and 999999'
			)
		}
		return this.maintenanceService.complete(user.id, id, actualCost, notes)
	}

	@Post(':id/cancel')
	@ApiOperation({ summary: 'Cancel maintenance request' })
	@ApiResponse({ status: HttpStatus.OK })
	async cancel(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body('reason') reason?: string
	) {
		return this.maintenanceService.cancel(user.id, id, reason)
=======
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
>>>>>>> origin/main
	}
}
