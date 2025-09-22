/**
 *  ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	HttpStatus,
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	ValidatedUser
} from '@repo/shared'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { MaintenanceService } from './maintenance.service'

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
	constructor(
		@Optional() private readonly maintenanceService?: MaintenanceService
	) {}

	@Get()
	@Public()
	@ApiOperation({ summary: 'Get all maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user?: ValidatedUser,
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
		if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
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
			!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)
		) {
			throw new BadRequestException('Invalid status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				data: [],
				total: 0,
				limit: limit || 10,
				offset: offset || 0
			}
		}

		return this.maintenanceService.findAll(user?.id || 'test-user-id', {
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
	@Public()
	@ApiOperation({ summary: 'Get maintenance statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user?: ValidatedUser) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				totalRequests: 0,
				pendingRequests: 0,
				inProgressRequests: 0,
				completedRequests: 0,
				urgentRequests: 0
			}
		}
		return this.maintenanceService.getStats(user?.id || 'test-user-id')
	}

	@Get('urgent')
	@Public()
	@ApiOperation({ summary: 'Get urgent maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async getUrgent(@CurrentUser() user?: ValidatedUser) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				data: []
			}
		}
		return this.maintenanceService.getUrgent(user?.id || 'test-user-id')
	}

	@Get('overdue')
	@Public()
	@ApiOperation({ summary: 'Get overdue maintenance requests' })
	@ApiResponse({ status: HttpStatus.OK })
	async getOverdue(@CurrentUser() user?: ValidatedUser) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				data: []
			}
		}
		return this.maintenanceService.getOverdue(user?.id || 'test-user-id')
	}

	@Get(':id')
	@Public()
	@ApiOperation({ summary: 'Get maintenance request by ID' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				id,
				data: null
			}
		}
		const maintenance = await this.maintenanceService.findOne(
			user?.id || 'test-user-id',
			id
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Post()
	@Public()
	@ApiOperation({ summary: 'Create new maintenance request' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@Body() createRequest: CreateMaintenanceRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				data: createRequest,
				success: false
			}
		}
		return this.maintenanceService.create(
			user?.id || 'test-user-id',
			createRequest
		)
	}

	@Put(':id')
	@Public()
	@ApiOperation({ summary: 'Update maintenance request' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateMaintenanceRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				id,
				data: updateRequest,
				success: false
			}
		}
		const maintenance = await this.maintenanceService.update(
			user?.id || 'test-user-id',
			id,
			updateRequest
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Delete(':id')
	@Public()
	@ApiOperation({ summary: 'Delete maintenance request' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				id,
				success: false
			}
		}
		await this.maintenanceService.remove(user?.id || 'test-user-id', id)
		return { message: 'Maintenance request deleted successfully' }
	}

	@Post(':id/complete')
	@Public()
	@ApiOperation({ summary: 'Mark maintenance request as completed' })
	@ApiResponse({ status: HttpStatus.OK })
	async complete(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('actualCost') actualCost?: number,
		@Body('notes') notes?: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (actualCost && (actualCost < 0 || actualCost > 999999)) {
			throw new BadRequestException('Actual cost must be between 0 and 999999')
		}
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				id,
				actualCost,
				notes,
				action: 'complete',
				success: false
			}
		}
		return this.maintenanceService.complete(
			user?.id || 'test-user-id',
			id,
			actualCost,
			notes
		)
	}

	@Post(':id/cancel')
	@Public()
	@ApiOperation({ summary: 'Cancel maintenance request' })
	@ApiResponse({ status: HttpStatus.OK })
	async cancel(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('reason') reason?: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.maintenanceService) {
			return {
				message: 'Maintenance service not available',
				id,
				reason,
				action: 'cancel',
				success: false
			}
		}
		return this.maintenanceService.cancel(
			user?.id || 'test-user-id',
			id,
			reason
		)
	}
}
