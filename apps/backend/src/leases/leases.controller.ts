/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
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

	@Get('analytics/performance')
	@ApiOperation({ summary: 'Get per-lease performance analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeasePerformanceAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('leaseId') leaseId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		// Validate UUIDs if provided
		if (leaseId && !leaseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['30d', '90d', '6m', '1y'].includes(timeframe ?? '90d')) {
			throw new BadRequestException('Invalid timeframe. Must be one of: 30d, 90d, 6m, 1y')
		}

		return this.leasesService.getLeasePerformanceAnalytics(user.id, {
			leaseId,
			propertyId,
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	@ApiOperation({ summary: 'Get lease duration and renewal analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseDurationAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['monthly', 'quarterly', 'yearly'].includes(period ?? 'yearly')) {
			throw new BadRequestException('Invalid period. Must be one of: monthly, quarterly, yearly')
		}

		return this.leasesService.getLeaseDurationAnalytics(user.id, {
			propertyId,
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	@ApiOperation({ summary: 'Get lease turnover and retention analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseTurnoverAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['6m', '12m', '24m', '36m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException('Invalid timeframe. Must be one of: 6m, 12m, 24m, 36m')
		}

		return this.leasesService.getLeaseTurnoverAnalytics(user.id, {
			propertyId,
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	@ApiOperation({ summary: 'Get per-lease revenue analytics and trends' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseRevenueAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('leaseId') leaseId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate UUIDs if provided
		if (leaseId && !leaseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['weekly', 'monthly', 'quarterly'].includes(period ?? 'monthly')) {
			throw new BadRequestException('Invalid period. Must be one of: weekly, monthly, quarterly')
		}

		return this.leasesService.getLeaseRevenueAnalytics(user.id, {
			leaseId,
			propertyId,
			period: period ?? 'monthly'
		})
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
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update lease' })
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
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete lease' })
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
	}
}
