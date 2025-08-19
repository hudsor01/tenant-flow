import {
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
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { LeaseQueryOptions, LeasesService, LeaseWithRelations } from './leases.service'
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
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
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
			status: status as 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | undefined,
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
			data,
			message: 'Leases retrieved successfully'
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get lease statistics' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.leasesService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully'
		}
	}

	@Get('expiring')
	@ApiOperation({ summary: 'Get expiring leases' })
	@ApiResponse({ status: 200, description: 'Expiring leases retrieved successfully' })
	async getExpiringLeases(
		@CurrentUser() user: ValidatedUser,
		@Query('days') days?: string
	): Promise<ControllerApiResponse<LeaseWithRelations[]>> {
		const daysNumber = days ? parseInt(days) : 30
		const data = await this.leasesService.getExpiringLeases(user.id, daysNumber)
		return {
			success: true,
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
			data,
			message: 'Lease retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new lease' })
	@ApiResponse({ status: 201, description: 'Lease created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@ApiResponse({ status: 409, description: 'Lease dates conflict with existing lease' })
	@UsageLimit({ feature: 'leases' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createLeaseDto: CreateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations>> {
		const data = await this.leasesService.create(createLeaseDto, user.id)
		return {
			success: true,
			data,
			message: 'Lease created successfully'
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update lease' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease updated successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ApiResponse({ status: 409, description: 'Lease dates conflict with existing lease' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateLeaseDto: UpdateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<LeaseWithRelations>> {
		const data = await this.leasesService.update(id, updateLeaseDto, user.id)
		return {
			success: true,
			data,
			message: 'Lease updated successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete lease' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease deleted successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.leasesService.remove(id, user.id)
		return {
			success: true,
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
	}
}