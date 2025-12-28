/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators (except @JwtToken/@user_id), validation layers, middleware
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
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { user_id } from '../../shared/decorators/user.decorator'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceReportingService } from './maintenance-reporting.service'
import { MaintenanceWorkflowService } from './maintenance-workflow.service'
import { CreateMaintenanceDto } from './dto/create-maintenance.dto'
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto'
import type {
	MaintenanceRequestCreate,
	MaintenanceRequestUpdate
} from '@repo/shared/validation/maintenance'
import { isValidUUID } from '@repo/shared/validation/common'

@Controller('maintenance')
export class MaintenanceController {
	constructor(
		private readonly maintenanceService: MaintenanceService,
		private readonly reportingService: MaintenanceReportingService,
		private readonly workflowService: MaintenanceWorkflowService
	) {}

	/**
	 * Get all maintenance requests
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get()
	async findAll(
		@JwtToken() token: string,
		@Query('unit_id') unit_id?: string,
		@Query('property_id') property_id?: string,
		@Query('priority') priority?: string,
		@Query('category') category?: string,
		@Query('status') status?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('created_at')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		// Validate UUIDs if provided
		if (unit_id && !isValidUUID(unit_id)) {
			throw new BadRequestException('Invalid unit ID')
		}
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate enum values
		if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
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
			!['open', 'in_progress', 'completed', 'CANCELED', 'on_hold'].includes(
				status
			)
		) {
			throw new BadRequestException('Invalid status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		// RLS: Pass JWT token to service layer
		const data = await this.maintenanceService.findAll(token, {
			unit_id,
			property_id,
			priority,
			category,
			status,
			limit,
			offset,
			sortBy,
			sortOrder
		})

		// Return PaginatedResponse format expected by frontend
		const safeLimit = limit ?? 10
		const safeOffset = offset ?? 0
		return {
			data,
			total: data.length,
			limit: safeLimit,
			offset: safeOffset,
			hasMore: data.length >= safeLimit
		}
	}

	/**
	 * Get maintenance statistics
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('stats')
	async getStats(@JwtToken() token: string) {
		return this.reportingService.getStats(token)
	}

	/**
	 * Get urgent maintenance requests
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('urgent')
	async getUrgent(@JwtToken() token: string) {
		return this.reportingService.getUrgent(token)
	}

	/**
	 * Get overdue maintenance requests
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('overdue')
	async getOverdue(@JwtToken() token: string) {
		return this.reportingService.getOverdue(token)
	}

	/**
	 * Create expense for maintenance request
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post('expenses')
	async createExpense(
		@JwtToken() token: string,
		@Body('maintenance_request_id', ParseUUIDPipe) maintenanceRequestId: string,
		@Body('vendor_name') vendorName?: string,
		@Body('amount') amount?: number,
		@Body('expense_date') expenseDate?: string
	) {
		if (!amount || amount <= 0) {
			throw new BadRequestException('Amount must be greater than 0')
		}
		if (amount > 999999) {
			throw new BadRequestException('Amount cannot exceed 999999')
		}
		if (!expenseDate) {
			throw new BadRequestException('Expense date is required')
		}

		return this.maintenanceService.createExpense(token, {
			maintenance_request_id: maintenanceRequestId,
			vendor_name: vendorName ?? null,
			amount,
			expense_date: expenseDate
		})
	}

	/**
	 * Get expenses for a maintenance request
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get(':id/expenses')
	async getExpenses(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		return this.maintenanceService.getExpenses(token, id)
	}

	/**
	 * Delete an expense
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Delete('expenses/:expenseId')
	async deleteExpense(
		@Param('expenseId', ParseUUIDPipe) expenseId: string,
		@JwtToken() token: string
	) {
		await this.maintenanceService.deleteExpense(token, expenseId)
		return { message: 'Expense deleted successfully' }
	}

	/**
	 * Get one maintenance request by ID
	 * RLS COMPLIANT: Uses @JwtToken() decorator
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
	 * RLS COMPLIANT: Uses @JwtToken() and @user_id() decorators
	 */
	@Post()
	async create(
		@Body() dto: CreateMaintenanceDto,
		@JwtToken() token: string,
		@user_id() user_id: string
	) {
		return this.maintenanceService.create(
			token,
			user_id,
			dto as MaintenanceRequestCreate
		)
	}

	/**
	 * Update maintenance request
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateMaintenanceDto,
		@JwtToken() token: string,
		@Body('version') expectedVersion?: number
	) {
		const maintenance = await this.maintenanceService.update(
			token,
			id,
			dto as MaintenanceRequestUpdate,
			expectedVersion
		)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	/**
	 * Delete maintenance request
	 * RLS COMPLIANT: Uses @JwtToken() decorator
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
	 * RLS COMPLIANT: Uses @JwtToken() decorator
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
		return this.workflowService.complete(token, id, actualCost, notes)
	}

	/**
	 * Cancel maintenance request
	 * RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post(':id/cancel')
	async cancel(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		return this.workflowService.cancel(token, id, reason)
	}
}
