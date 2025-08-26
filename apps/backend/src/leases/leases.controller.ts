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
import { LeasesService } from './leases.service'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest
} from '../schemas/leases.schema'

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
	constructor(private readonly leasesService: LeasesService) {}

	@Get()
	@ApiOperation({ summary: 'Get all leases' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('tenantId') tenantId?: string,
		@Query('unitId') unitId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('status') status?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		// Validate UUIDs if provided
		if (
			tenantId &&
			!tenantId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid tenant ID')
		}
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

		// Validate status enum
		if (
			status &&
			!['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'].includes(status)
		) {
			throw new BadRequestException('Invalid lease status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		return this.leasesService.findAll(user.id, {
			tenantId,
			unitId,
			propertyId,
			status,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get lease statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.leasesService.getStats(user.id)
	}

	@Get('expiring')
	@ApiOperation({ summary: 'Get expiring leases' })
	@ApiResponse({ status: HttpStatus.OK })
	async getExpiring(
		@CurrentUser() user: ValidatedUser,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		return this.leasesService.getExpiring(user.id, days ?? 30)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get lease by ID' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const lease = await this.leasesService.findOne(user.id, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	@ApiOperation({ summary: 'Create new lease' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createRequest: CreateLeaseRequest
	) {
		return this.leasesService.create(user.id, createRequest)
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
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import {
	LeaseQueryOptions,
	LeasesService,
	LeaseWithRelations
} from './leases.service'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { CreateLeaseDto, UpdateLeaseDto } from '../shared/types/dto-exports'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { UsageLimit } from '../shared/decorators/usage-limits.decorator'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Leases controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('leases')
@Controller('leases')
@UseGuards(UnifiedAuthGuard, UsageLimitsGuard)
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly leasePDFService: LeasePDFService
	) {}

	@Get()
	@ApiOperation({ summary: 'Get all leases for current user' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('status') status?: string,
		@Query('unitId') unitId?: string,
		@Query('tenantId') tenantId?: string,
		@Query('startDateFrom') startDateFrom?: string,
		@Query('startDateTo') startDateTo?: string,
		@Query('endDateFrom') endDateFrom?: string,
		@Query('endDateTo') endDateTo?: string,
		@Query('search') search?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const options: LeaseQueryOptions = {
			status: status as
				| 'DRAFT'
				| 'ACTIVE'
				| 'EXPIRED'
				| 'TERMINATED'
				| undefined,
			unitId,
			tenantId,
			startDateFrom,
			startDateTo,
			endDateFrom,
			endDateTo,
			search,
			limit: limit ? parseInt(limit) : undefined,
			offset: offset ? parseInt(offset) : undefined
		}

		const data = await this.leasesService.findAll(user.id, options)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Leases retrieved successfully'
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get lease statistics' })
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.leasesService.getStats(user.id)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Statistics retrieved successfully'
		}
	}

	@Get('expiring')
	@ApiOperation({ summary: 'Get expiring leases' })
	@ApiResponse({
		status: 200,
		description: 'Expiring leases retrieved successfully'
	})
	async getExpiringLeases(
		@CurrentUser() user: ValidatedUser,
		@Query('days') days?: string
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const daysNumber = days ? parseInt(days) : 30
		const data = await this.leasesService.getExpiringLeases(
			user.id,
			daysNumber
		)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Expiring leases retrieved successfully'
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search leases' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const data = await this.leasesService.search(user.id, searchTerm || '')
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Search completed successfully'
		}
	}

	@Get('by-unit/:unitId')
	@ApiOperation({ summary: 'Get leases for a specific unit' })
	@ApiParam({ name: 'unitId', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	async getLeasesByUnit(
		@Param('unitId', ParseUUIDPipe) unitId: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const data = await this.leasesService.findByUnit(unitId, user.id)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Leases retrieved successfully'
		}
	}

	@Get('by-tenant/:tenantId')
	@ApiOperation({ summary: 'Get leases for a specific tenant' })
	@ApiParam({ name: 'tenantId', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	async getLeasesByTenant(
		@Param('tenantId', ParseUUIDPipe) tenantId: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const data = await this.leasesService.findByTenant(tenantId, user.id)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Leases retrieved successfully'
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get lease by ID' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations>> {
		const data = await this.leasesService.findOne(id, user.id)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Lease retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new lease' })
	@ApiResponse({ status: 201, description: 'Lease created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@ApiResponse({
		status: 409,
		description: 'Lease dates conflict with existing lease'
	})
	@UsageLimit({ feature: 'leases' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createLeaseDto: CreateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations>> {
		const data = await this.leasesService.create(createLeaseDto, user.id)
		return {
			success: true,
			timestamp: new Date(),
			data,
			message: 'Lease created successfully'
		}
>>>>>>> origin/main
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update lease' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateLeaseRequest
	) {
		const lease = await this.leasesService.update(
			user.id,
			id,
			updateRequest
		)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
=======
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease updated successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ApiResponse({
		status: 409,
		description: 'Lease dates conflict with existing lease'
	})
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateLeaseDto: UpdateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations>> {
		const data = await this.leasesService.update(
			id,
			updateLeaseDto,
			user.id
		)
		return {
			success: true, // This line was already present
			timestamp: new Date(),
			data,
			message: 'Lease updated successfully'
		}
>>>>>>> origin/main
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete lease' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.leasesService.remove(user.id, id)
	}

	@Post(':id/renew')
	@ApiOperation({ summary: 'Renew lease' })
	@ApiResponse({ status: HttpStatus.OK })
	async renew(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body('endDate') endDate: string
	) {
		// Validate date format
		if (!endDate || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException(
				'Invalid date format (YYYY-MM-DD required)'
			)
		}
		return this.leasesService.renew(user.id, id, endDate)
	}

	@Post(':id/terminate')
	@ApiOperation({ summary: 'Terminate lease' })
	@ApiResponse({ status: HttpStatus.OK })
	async terminate(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body('reason') reason?: string
	) {
		return this.leasesService.terminate(user.id, id, reason)
=======
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease deleted successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.leasesService.remove(id, user.id)
		return {
			timestamp: new Date(),
			success: true,
			data: null,
			message: 'Lease deleted successfully'
		}
	}

	@Get(':id/pdf')
	@ApiOperation({
		summary: 'Generate lease agreement PDF',
		description: 'Generate a professional PDF lease agreement document'
	})
	@ApiResponse({
		status: 200,
		description: 'PDF generated successfully',
		headers: {
			'Content-Type': { description: 'application/pdf' },
			'Content-Disposition': {
				description: 'attachment; filename="lease.pdf"'
			}
		}
	})
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ApiResponse({ status: 500, description: 'PDF generation failed' })
	async generateLeasePDF(
		@Param('id', ParseUUIDPipe) leaseId: string,
		@CurrentUser() user: ValidatedUser,
		@Res() response: FastifyReply,
		@Query('format') format?: 'A4' | 'Letter' | 'Legal',
		@Query('branding') includeBranding?: string
	): Promise<void> {
		const options = {
			format: format || 'Letter',
			includeBranding: includeBranding === 'true',
			includePageNumbers: true
		}

		const result = await this.leasePDFService.generateLeasePdf(
			leaseId,
			user.id,
			options
		)

		// Set response headers
		response.header('Content-Type', result.mimeType)
		response.header('Content-Length', result.size.toString())
		response.header(
			'Content-Disposition',
			`attachment; filename="${result.filename}"`
		)
		response.header('Cache-Control', 'no-cache, no-store, must-revalidate')
		response.header('Pragma', 'no-cache')
		response.header('Expires', '0')

		// Stream the PDF buffer
		response.send(result.buffer)
>>>>>>> origin/main
	}
}
