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
	Query
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { LeasesService } from './leases.service'
import { LeaseQueryService } from './lease-query.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { CreateLeaseDto } from './dto/create-lease.dto'
import { UpdateLeaseDto } from './dto/update-lease.dto'
import { FindAllLeasesDto } from './dto/find-all-leases.dto'

@Controller('leases')
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly queryService: LeaseQueryService,
		private readonly lifecycleService: LeaseLifecycleService
	) {}

	@Get()
	async findAll(@JwtToken() token: string, @Query() query: FindAllLeasesDto) {
		const data = await this.queryService.findAll(token, { ...query })

		return {
			...data,
			hasMore: data.data.length >= data.limit
		}
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		const lease = await this.queryService.findOne(token, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	async create(@Body() dto: CreateLeaseDto, @JwtToken() token: string) {
		return this.leasesService.create(token, dto)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateLeaseDto,
		@JwtToken() token: string
	) {
		const lease = await this.leasesService.update(token, id, dto)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		await this.leasesService.remove(token, id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('end_date') end_date: string,
		@JwtToken() token: string
	) {
		if (!end_date || !end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		return this.lifecycleService.renew(token, id, end_date)
	}

	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		return this.lifecycleService.terminate(
			token,
			id,
			new Date().toISOString(),
			reason
		)
	}
}
