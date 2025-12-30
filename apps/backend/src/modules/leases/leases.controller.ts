/**
 * Leases Controller - Core CRUD Operations
 *
 * Handles core lease operations:
 * - GET /leases (findAll with pagination)
 * - GET /leases/:id (findOne)
 * - POST /leases (create)
 * - PUT /leases/:id (update)
 * - DELETE /leases/:id (remove)
 * - POST /leases/:id/renew (renew lease)
 * - POST /leases/:id/terminate (terminate lease)
 *
 * Related controllers (extracted per CLAUDE.md <300 line limit):
 * - LeaseAnalyticsController: stats, analytics, expiring endpoints
 * - LeaseSignatureController: e-signature workflow endpoints
 * - LeasePdfController: PDF generation endpoints
 */

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Request,
	UnauthorizedException
} from '@nestjs/common'
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
import { LeasesService } from './leases.service'
import { LeaseQueryService } from './lease-query.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { CreateLeaseDto } from './dto/create-lease.dto'
import { UpdateLeaseDto } from './dto/update-lease.dto'
import { FindAllLeasesDto } from './dto/find-all-leases.dto'

@ApiTags('Leases')
@ApiBearerAuth('supabase-auth')
@Controller('leases')
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly queryService: LeaseQueryService,
		private readonly lifecycleService: LeaseLifecycleService
	) {}

	@ApiOperation({ summary: 'List all leases', description: 'Get all leases with filtering and pagination' })
	@ApiQuery({ name: 'status', required: false, enum: ['active', 'expired', 'terminated', 'pending'], description: 'Filter by lease status' })
	@ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiResponse({ status: 200, description: 'List of leases with pagination info' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async findAll(@Request() req: AuthenticatedRequest, @Query() query: FindAllLeasesDto) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const data = await this.queryService.findAll(token, { ...query })

		return {
			...data,
			hasMore: data.data.length >= data.limit
		}
	}

	@ApiOperation({ summary: 'Get lease by ID', description: 'Get a single lease by its UUID' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiResponse({ status: 200, description: 'Lease details' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const lease = await this.queryService.findOne(token, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@ApiOperation({ summary: 'Create lease', description: 'Create a new lease' })
	@ApiBody({ type: CreateLeaseDto })
	@ApiResponse({ status: 201, description: 'Lease created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async create(@Body() dto: CreateLeaseDto, @Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.leasesService.create(token, dto)
	}

	@ApiOperation({ summary: 'Update lease', description: 'Update an existing lease by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiBody({ type: UpdateLeaseDto })
	@ApiResponse({ status: 200, description: 'Lease updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateLeaseDto,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const lease = await this.leasesService.update(token, id, dto)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@ApiOperation({ summary: 'Delete lease', description: 'Delete a lease by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiResponse({ status: 200, description: 'Lease deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		await this.leasesService.remove(token, id)
		return { message: 'Lease deleted successfully' }
	}

	@ApiOperation({ summary: 'Renew lease', description: 'Renew an existing lease with a new end date' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiBody({ schema: { type: 'object', properties: { end_date: { type: 'string', format: 'date', example: '2025-12-31' } }, required: ['end_date'] } })
	@ApiResponse({ status: 200, description: 'Lease renewed successfully' })
	@ApiResponse({ status: 400, description: 'Invalid date format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('end_date') end_date: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		if (!end_date || !end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		return this.lifecycleService.renew(token, id, end_date)
	}

	@ApiOperation({ summary: 'Terminate lease', description: 'Terminate an active lease' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string', description: 'Reason for termination' } } } })
	@ApiResponse({ status: 200, description: 'Lease terminated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
		@Body('reason') reason?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.lifecycleService.terminate(
			token,
			id,
			new Date().toISOString(),
			reason
		)
	}
}
