/**
 * 🚨 ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS 🚨
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * ❌ FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
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
import type { ValidatedUser } from '@repo/shared/types/auth'
import { MaintenanceService } from './maintenance.service'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '../schemas/maintenance.schema'

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Get()
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
	}
}
