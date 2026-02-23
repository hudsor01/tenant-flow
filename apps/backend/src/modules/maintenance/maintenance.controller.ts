/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, validation layers, middleware
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
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	normalizeLimit,
	normalizeOffset
} from '../../shared/utils/pagination.utils'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
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

@ApiTags('Maintenance')
@ApiBearerAuth('supabase-auth')
@Controller('maintenance')
export class MaintenanceController {
	constructor(
		private readonly maintenanceService: MaintenanceService,
		private readonly reportingService: MaintenanceReportingService,
		private readonly workflowService: MaintenanceWorkflowService
	) {}

	@ApiOperation({ summary: 'List maintenance requests', description: 'Get all maintenance requests with filtering and pagination' })
	@ApiQuery({ name: 'unit_id', required: false, description: 'Filter by unit UUID' })
	@ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
	@ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by priority' })
	@ApiQuery({ name: 'category', required: false, enum: ['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'GENERAL', 'OTHER'], description: 'Filter by category' })
	@ApiQuery({ name: 'status', required: false, enum: ['open', 'in_progress', 'completed', 'CANCELED', 'on_hold'], description: 'Filter by status' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'created_at' })
	@ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
	@ApiResponse({ status: 200, description: 'List of maintenance requests with pagination info' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async findAll(
		@Request() req: AuthenticatedRequest,
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
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

		// Normalize pagination values
		const safeLimit = normalizeLimit(limit ?? 10)
		const safeOffset = normalizeOffset(offset ?? 0)

		// RLS: Pass JWT token to service layer
		const { data, count } = await this.maintenanceService.findAll(token, {
			unit_id,
			property_id,
			priority,
			category,
			status,
			limit: safeLimit,
			offset: safeOffset,
			sortBy,
			sortOrder
		})

		// Return PaginatedResponse format expected by frontend
		// Use count from Supabase { count: 'exact' } for accurate total
		return {
			data,
			total: count,
			limit: safeLimit,
			offset: safeOffset,
			hasMore: safeOffset + data.length < count
		}
	}

	@ApiOperation({ summary: 'Get maintenance statistics', description: 'Returns aggregated maintenance stats' })
	@ApiResponse({ status: 200, description: 'Maintenance statistics' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stats')
	async getStats(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.reportingService.getStats(token)
	}

	@ApiOperation({ summary: 'Get urgent requests', description: 'Get all urgent maintenance requests' })
	@ApiResponse({ status: 200, description: 'List of urgent maintenance requests' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('urgent')
	async getUrgent(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.reportingService.getUrgent(token)
	}

	@ApiOperation({ summary: 'Get overdue requests', description: 'Get all overdue maintenance requests' })
	@ApiResponse({ status: 200, description: 'List of overdue maintenance requests' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('overdue')
	async getOverdue(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.reportingService.getOverdue(token)
	}

	@ApiOperation({ summary: 'Create expense', description: 'Add an expense to a maintenance request' })
	@ApiBody({ schema: { type: 'object', properties: { maintenance_request_id: { type: 'string' }, vendor_name: { type: 'string' }, amount: { type: 'number' }, expense_date: { type: 'string', format: 'date' } }, required: ['maintenance_request_id', 'amount', 'expense_date'] } })
	@ApiResponse({ status: 201, description: 'Expense created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('expenses')
	async createExpense(
		@Request() req: AuthenticatedRequest,
		@Body('maintenance_request_id', ParseUUIDPipe) maintenanceRequestId: string,
		@Body('vendor_name') vendorName?: string,
		@Body('amount') amount?: number,
		@Body('expense_date') expenseDate?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

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

	@ApiOperation({ summary: 'Get expenses for request', description: 'Get all expenses for a maintenance request' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiResponse({ status: 200, description: 'List of expenses' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/expenses')
	async getExpenses(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.maintenanceService.getExpenses(token, id)
	}

	@ApiOperation({ summary: 'Delete expense', description: 'Delete a maintenance expense' })
	@ApiParam({ name: 'expenseId', type: String, description: 'Expense UUID' })
	@ApiResponse({ status: 200, description: 'Expense deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('expenses/:expenseId')
	async deleteExpense(
		@Param('expenseId', ParseUUIDPipe) expenseId: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		await this.maintenanceService.deleteExpense(token, expenseId)
		return { message: 'Expense deleted successfully' }
	}

	@ApiOperation({ summary: 'Get request by ID', description: 'Get a single maintenance request by its UUID' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiResponse({ status: 200, description: 'Maintenance request details' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const maintenance = await this.maintenanceService.findOne(token, id)
		if (!maintenance) {
			throw new NotFoundException('Maintenance request not found')
		}
		return maintenance
	}

	@ApiOperation({ summary: 'Create maintenance request', description: 'Create a new maintenance request' })
	@ApiBody({ schema: { type: 'object', properties: { unit_id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, category: { type: 'string', enum: ['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'STRUCTURAL', 'GENERAL', 'OTHER'] } }, required: ['unit_id', 'title'] } })
	@ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async create(
		@Body() dto: CreateMaintenanceDto,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.maintenanceService.create(
			token,
			req.user.id,
			dto as MaintenanceRequestCreate
		)
	}

	@ApiOperation({ summary: 'Update maintenance request', description: 'Update an existing maintenance request by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiBody({ type: UpdateMaintenanceDto })
	@ApiResponse({ status: 200, description: 'Maintenance request updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateMaintenanceDto,
		@Request() req: AuthenticatedRequest,
		@Body('version') expectedVersion?: number
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Delete maintenance request', description: 'Delete a maintenance request by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiResponse({ status: 200, description: 'Maintenance request deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		await this.maintenanceService.remove(token, id)
		return { message: 'Maintenance request deleted successfully' }
	}

	@ApiOperation({ summary: 'Complete maintenance request', description: 'Mark a maintenance request as completed' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiBody({ schema: { type: 'object', properties: { actualCost: { type: 'number', description: 'Actual cost of the maintenance work' }, notes: { type: 'string', description: 'Completion notes' } } } })
	@ApiResponse({ status: 200, description: 'Maintenance request completed successfully' })
	@ApiResponse({ status: 400, description: 'Invalid cost value' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	@Post(':id/complete')
	async complete(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
		@Body('actualCost') actualCost?: number,
		@Body('notes') notes?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		if (actualCost && (actualCost < 0 || actualCost > 999999)) {
			throw new BadRequestException('Actual cost must be between 0 and 999999')
		}
		return this.workflowService.complete(token, id, actualCost, notes)
	}

	@ApiOperation({ summary: 'Cancel maintenance request', description: 'Cancel a maintenance request' })
	@ApiParam({ name: 'id', type: String, description: 'Maintenance request UUID' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string', description: 'Reason for cancellation' } } } })
	@ApiResponse({ status: 200, description: 'Maintenance request cancelled successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	@Post(':id/cancel')
	async cancel(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
		@Body('reason') reason?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.workflowService.cancel(token, id, reason)
	}
}
