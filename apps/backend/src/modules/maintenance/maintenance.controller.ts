/**
 *  ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators (except @JwtToken/@UserId), validation layers, middleware
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
	Query
} from '@nestjs/common'
import type { CreateMaintenanceRequest, UpdateMaintenanceRequest } from '@repo/shared/types/api-contracts'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { UserId } from '../../shared/decorators/user.decorator'
import { MaintenanceService } from './maintenance.service'
import { CreateMaintenanceDto } from './dto/create-maintenance.dto'
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto'

@Controller('maintenance')
export class MaintenanceController {
	constructor(private readonly maintenanceService: MaintenanceService) {}

	/**
	 * Get all maintenance requests
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get()
	async findAll(
		@JwtToken() token: string,
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

		// ✅ RLS: Pass JWT token to service layer
		return this.maintenanceService.findAll(token, {
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

	/**
	 * Get maintenance statistics
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('stats')
	async getStats(@JwtToken() token: string) {
		return this.maintenanceService.getStats(token)
	}

	/**
	 * Get urgent maintenance requests
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('urgent')
	async getUrgent(@JwtToken() token: string) {
		return this.maintenanceService.getUrgent(token)
	}

	/**
	 * Get overdue maintenance requests
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('overdue')
	async getOverdue(@JwtToken() token: string) {
		return this.maintenanceService.getOverdue(token)
	}

	/**
	 * Get one maintenance request by ID
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		const maintenance = await this.maintenanceService.findOne(token, id)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	/**
	 * Create maintenance request
	 * ✅ RLS COMPLIANT: Uses @JwtToken() and @UserId() decorators
	 */
	@Post()
	async create(
		@Body() dto: CreateMaintenanceDto,
		@JwtToken() token: string,
		@UserId() userId: string
	) {
		return this.maintenanceService.create(token, userId, dto as unknown as CreateMaintenanceRequest)
	}

	/**
	 * Update maintenance request
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateMaintenanceDto,
		@JwtToken() token: string
	) {
		// 🔐 Pass version for optimistic locking
		const expectedVersion = (dto as unknown as { version?: number }).version
		const maintenance = await this.maintenanceService.update(
			token,
			id,
			dto as unknown as UpdateMaintenanceRequest,
			expectedVersion
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	/**
	 * Delete maintenance request
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		await this.maintenanceService.remove(token, id)
		return { message: 'Maintenance request deleted successfully' }
	}

	/**
	 * Complete maintenance request
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post(':id/complete')
	async complete(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('actualCost') actualCost?: number,
		@Body('notes') notes?: string
	) {
		if (actualCost && (actualCost < 0 || actualCost > 999999)) {
			throw new BadRequestException('Actual cost must be between 0 and 999999')
		}
		return this.maintenanceService.complete(token, id, actualCost, notes)
	}

	/**
	 * Cancel maintenance request
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post(':id/cancel')
	async cancel(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		return this.maintenanceService.cancel(token, id, reason)
	}
}
