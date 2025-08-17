import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	Res,
	UseGuards
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { LeasesService } from './leases.service'
import { LeasePDFService } from './services/lease-pdf.service'
import { Lease } from '@repo/shared'
import {
	CreateLeaseDto,
	createLeaseSchema,
	LeaseQueryDto,
	queryLeasesSchema,
	UpdateLeaseDto,
	updateLeaseSchema,
	uuidSchema
} from '../common/dto/dto-exports'
import {
	ZodBody,
	ZodParam,
	ZodQuery,
	ZodValidation
} from '../common/decorators/zod-validation.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'

@ApiTags('leases')
@Controller('leases')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly leasePDFService: LeasePDFService
	) {}

	@Post()
	@ApiOperation({ summary: 'Create a new lease' })
	@ApiResponse({ status: 201, description: 'Lease created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@ApiResponse({
		status: 409,
		description: 'Lease dates conflict with existing lease'
	})
	@UsageLimit({ resource: 'leases', action: 'create' })
	@ZodBody(createLeaseSchema)
	async create(
		@Body() data: CreateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Lease> {
		return this.leasesService.create(data, user.id)
	}

	@Get()
	@ApiOperation({ summary: 'Get leases for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	@ZodQuery(queryLeasesSchema)
	async findAll(
		@Query() query: LeaseQueryDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Lease[]> {
		const options = {
		status: query.status,
		unitId: query.unitId,
		tenantId: query.tenantId,
		startDateFrom: query.startDateFrom?.toISOString(),
		startDateTo: query.startDateTo?.toISOString(),
		endDateFrom: query.endDateFrom?.toISOString(),
		endDateTo: query.endDateTo?.toISOString(),
		search: (query as LeaseQueryDto & { search?: string }).search,
		limit: query.limit,
		offset: query.offset
	}
	return this.leasesService.getByOwner(user.id, options)
	}

	@Get('stats')
	@ApiOperation({
		summary: 'Get lease statistics for the authenticated user'
	})
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.leasesService.getStats(user.id)
	}

	@Get('by-unit/:unitId')
	@ApiOperation({ summary: 'Get leases for a specific unit' })
	@ApiParam({ name: 'unitId', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	@ZodValidation({
		params: uuidSchema,
		query: queryLeasesSchema
	})
	async getLeasesByUnit(
		@Param('unitId') unitId: string,
		@CurrentUser() user: ValidatedUser,
		@Query() query: LeaseQueryDto
	): Promise<Lease[]> {
		const options = {
		status: query.status,
		unitId: query.unitId,
		tenantId: query.tenantId,
		startDateFrom: query.startDateFrom?.toISOString(),
		startDateTo: query.startDateTo?.toISOString(),
		endDateFrom: query.endDateFrom?.toISOString(),
		endDateTo: query.endDateTo?.toISOString(),
		search: (query as LeaseQueryDto & { search?: string }).search,
		limit: query.limit,
		offset: query.offset
	}
	return this.leasesService.getByUnit(unitId, user.id, options)
	}

	@Get('by-tenant/:tenantId')
	@ApiOperation({ summary: 'Get leases for a specific tenant' })
	@ApiParam({ name: 'tenantId', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Leases retrieved successfully' })
	@ZodValidation({
		params: uuidSchema,
		query: queryLeasesSchema
	})
	async getLeasesByTenant(
		@Param('tenantId') tenantId: string,
		@CurrentUser() user: ValidatedUser,
		@Query() query: LeaseQueryDto
	): Promise<Lease[]> {
		const options = {
		status: query.status,
		unitId: query.unitId,
		tenantId: query.tenantId,
		startDateFrom: query.startDateFrom?.toISOString(),
		startDateTo: query.startDateTo?.toISOString(),
		endDateFrom: query.endDateFrom?.toISOString(),
		endDateTo: query.endDateTo?.toISOString(),
		search: (query as LeaseQueryDto & { search?: string }).search,
		limit: query.limit,
		offset: query.offset
	}
	return this.leasesService.getByTenant(tenantId, user.id, options)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific lease by ID' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ZodParam(uuidSchema)
	async findOne(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<Lease> {
		return this.leasesService.findById(id, user.id)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a lease' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ApiResponse({
		status: 409,
		description: 'Lease dates conflict with existing lease'
	})
	@ZodValidation({
		params: uuidSchema,
		body: updateLeaseSchema
	})
	async update(
		@Param('id') id: string,
		@Body() data: UpdateLeaseDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Lease> {
		return this.leasesService.update(id, data, user.id)
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a lease' })
	@ApiParam({ name: 'id', description: 'Lease ID' })
	@ApiResponse({ status: 200, description: 'Lease deleted successfully' })
	@ApiResponse({ status: 404, description: 'Lease not found' })
	@ZodParam(uuidSchema)
	async remove(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<void> {
		await this.leasesService.delete(id, user.id)
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
		@Param('id') leaseId: string,
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

		const result = await this.leasePDFService.generateLeasePDF(
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
