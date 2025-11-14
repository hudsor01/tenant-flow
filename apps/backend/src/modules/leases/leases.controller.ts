/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

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
	Query
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { LeasesService } from './leases.service'
import { CreateLeaseDto } from './dto/create-lease.dto'
import { UpdateLeaseDto } from './dto/update-lease.dto'

@Controller('leases')
export class LeasesController {
	constructor(private readonly leasesService: LeasesService) {}

	@Get()
	async findAll(
		@JwtToken() token: string,
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

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.findAll(token, {
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
	async getStats(@JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getStats(token)
	}

	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@JwtToken() token: string,
		@Query('leaseId') leaseId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		// Validate UUIDs if provided
		if (
			leaseId &&
			!leaseId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['30d', '90d', '6m', '1y'].includes(timeframe ?? '90d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 30d, 90d, 6m, 1y'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getAnalytics(token, {
			...(leaseId ? { leaseId } : {}),
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@JwtToken() token: string,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['monthly', 'quarterly', 'yearly'].includes(period ?? 'yearly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: monthly, quarterly, yearly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getAnalytics(token, {
			...(propertyId ? { propertyId } : {}),
			timeframe: '90d',
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@JwtToken() token: string,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['6m', '12m', '24m', '36m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 6m, 12m, 24m, 36m'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getAnalytics(token, {
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@JwtToken() token: string,
		@Query('leaseId') leaseId?: string,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate UUIDs if provided
		if (
			leaseId &&
			!leaseId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['weekly', 'monthly', 'quarterly'].includes(period ?? 'monthly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: weekly, monthly, quarterly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getAnalytics(token, {
			...(leaseId ? { leaseId } : {}),
			...(propertyId ? { propertyId } : {}),
			timeframe: '90d',
			period: period ?? 'monthly'
		})
	}

	@Get('expiring')
	async getExpiring(
		@JwtToken() token: string,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.getExpiring(token, days ?? 30)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		const lease = await this.leasesService.findOne(token, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	async create(@Body() dto: CreateLeaseDto, @JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.create(token, dto)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateLeaseDto,
		@JwtToken() token: string
	) {
		//Pass version for optimistic locking
		const expectedVersion = (dto as { version?: number }).version
		const lease = await this.leasesService.update(
			token,
			id,
			dto,
			expectedVersion
		)
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
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		await this.leasesService.remove(token, id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('endDate') endDate: string,
		@JwtToken() token: string
	) {
		// Validate date format
		if (!endDate || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.renew(token, id, endDate)
	}

	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.terminate(
			token,
			id,
			new Date().toISOString(),
			reason
		)
	}
}
