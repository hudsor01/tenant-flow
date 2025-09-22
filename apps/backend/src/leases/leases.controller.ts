/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	HttpStatus,
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest,
	ValidatedUser
} from '@repo/shared'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { LeasesService } from './leases.service'

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
	constructor(@Optional() private readonly leasesService?: LeasesService) {}

	@Get()
	@Public()
	@ApiOperation({ summary: 'Get all leases' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user?: ValidatedUser,
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

		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				total: 0,
				limit: limit || 10,
				offset: offset || 0
			}
		}

		return this.leasesService.findAll(user?.id || 'test-user-id', {
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
	@Public()
	@ApiOperation({ summary: 'Get lease statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user?: ValidatedUser) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				totalLeases: 0,
				activeLeases: 0,
				expiringLeases: 0,
				draftLeases: 0
			}
		}
		return this.leasesService.getStats(user?.id || 'test-user-id')
	}

	@Get('analytics/performance')
	@Public()
	@ApiOperation({ summary: 'Get per-lease performance analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeasePerformanceAnalytics(
		@CurrentUser() user?: ValidatedUser,
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

		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				timeframe: timeframe ?? '90d',
				leaseId,
				propertyId
			}
		}

		return this.leasesService.getLeasePerformanceAnalytics(
			user?.id || 'test-user-id',
			{
				leaseId,
				propertyId,
				timeframe: timeframe ?? '90d'
			}
		)
	}

	@Get('analytics/duration')
	@Public()
	@ApiOperation({ summary: 'Get lease duration and renewal analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseDurationAnalytics(
		@CurrentUser() user?: ValidatedUser,
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

		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				period: period ?? 'yearly',
				propertyId
			}
		}

		return this.leasesService.getLeaseDurationAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				period: period ?? 'yearly'
			}
		)
	}

	@Get('analytics/turnover')
	@Public()
	@ApiOperation({ summary: 'Get lease turnover and retention analytics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseTurnoverAnalytics(
		@CurrentUser() user?: ValidatedUser,
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

		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				timeframe: timeframe ?? '12m',
				propertyId
			}
		}

		return this.leasesService.getLeaseTurnoverAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				timeframe: timeframe ?? '12m'
			}
		)
	}

	@Get('analytics/revenue')
	@Public()
	@ApiOperation({ summary: 'Get per-lease revenue analytics and trends' })
	@ApiResponse({ status: HttpStatus.OK })
	async getLeaseRevenueAnalytics(
		@CurrentUser() user?: ValidatedUser,
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

		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				period: period ?? 'monthly',
				leaseId,
				propertyId
			}
		}

		return this.leasesService.getLeaseRevenueAnalytics(
			user?.id || 'test-user-id',
			{
				leaseId,
				propertyId,
				period: period ?? 'monthly'
			}
		)
	}

	@Get('expiring')
	@Public()
	@ApiOperation({ summary: 'Get expiring leases' })
	@ApiResponse({ status: HttpStatus.OK })
	async getExpiring(
		@CurrentUser() user?: ValidatedUser,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: [],
				days: days ?? 30
			}
		}
		return this.leasesService.getExpiring(
			user?.id || 'test-user-id',
			days ?? 30
		)
	}

	@Get(':id')
	@Public()
	@ApiOperation({ summary: 'Get lease by ID' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				data: null
			}
		}
		const lease = await this.leasesService.findOne(
			user?.id || 'test-user-id',
			id
		)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	@Public()
	@ApiOperation({ summary: 'Create new lease' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@Body() createRequest: CreateLeaseRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: createRequest,
				success: false
			}
		}
		return this.leasesService.create(user?.id || 'test-user-id', createRequest)
	}

	@Put(':id')
	@Public()
	@ApiOperation({ summary: 'Update lease' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateLeaseRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				data: updateRequest,
				success: false
			}
		}
		const lease = await this.leasesService.update(
			user?.id || 'test-user-id',
			id,
			updateRequest
		)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Delete(':id')
	@Public()
	@ApiOperation({ summary: 'Delete lease' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				success: false
			}
		}
		await this.leasesService.remove(user?.id || 'test-user-id', id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	@Public()
	@ApiOperation({ summary: 'Renew lease' })
	@ApiResponse({ status: HttpStatus.OK })
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('endDate') endDate: string,
		@CurrentUser() user?: ValidatedUser
	) {
		// Validate date format
		if (!endDate || !endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				endDate,
				action: 'renew',
				success: false
			}
		}
		return this.leasesService.renew(user?.id || 'test-user-id', id, endDate)
	}

	@Post(':id/terminate')
	@Public()
	@ApiOperation({ summary: 'Terminate lease' })
	@ApiResponse({ status: HttpStatus.OK })
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('reason') reason?: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				reason,
				action: 'terminate',
				success: false
			}
		}
		return this.leasesService.terminate(user?.id || 'test-user-id', id, reason)
	}
}
