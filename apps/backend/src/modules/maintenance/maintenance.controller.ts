/**
 *  ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req
} from '@nestjs/common'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared/types/backend-domain'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { MaintenanceService } from './maintenance.service'

@Controller('maintenance')
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
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
			!['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'ON_HOLD'].includes(
				status
			)
		) {
			throw new BadRequestException('Invalid status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		return this.maintenanceService.findAll(userId, {
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
	async getStats(@Req() req: AuthenticatedRequest) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.getStats(userId)
	}

	@Get('urgent')
	async getUrgent(@Req() req: AuthenticatedRequest) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.getUrgent(userId)
	}

	@Get('overdue')
	async getOverdue(@Req() req: AuthenticatedRequest) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.getOverdue(userId)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		const maintenance = await this.maintenanceService.findOne(userId, id)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Post()
	async create(
		@Body() createRequest: CreateMaintenanceRequest,
		@Req() req: AuthenticatedRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.create(userId, createRequest)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateMaintenanceRequest,
		@Req() req: AuthenticatedRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id

		// 🔐 BUG FIX #2: Pass version for optimistic locking
		const expectedVersion = (updateRequest as { version?: number }).version
		const maintenance = await this.maintenanceService.update(
			userId,
			id,
			updateRequest,
			expectedVersion
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		await this.maintenanceService.remove(userId, id)
		return { message: 'Maintenance request deleted successfully' }
	}

	@Post(':id/complete')
	async complete(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body('actualCost') actualCost?: number,
		@Body('notes') notes?: string
	) {
		if (actualCost && (actualCost < 0 || actualCost > 999999)) {
			throw new BadRequestException('Actual cost must be between 0 and 999999')
		}
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.complete(userId, id, actualCost, notes)
	}

	@Post(':id/cancel')
	async cancel(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body('reason') reason?: string
	) {
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.maintenanceService.cancel(userId, id, reason)
	}
}
