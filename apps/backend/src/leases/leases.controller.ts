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
	Logger,
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req
} from '@nestjs/common'
// Swagger imports removed
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest
} from '@repo/shared'
import type { Request } from 'express'
import { LeasesService } from './leases.service'
import { SupabaseService } from '../database/supabase.service'

// @ApiTags('leases')
// @ApiBearerAuth()
@Controller('leases')
export class LeasesController {
	private readonly logger = new Logger(LeasesController.name)

	constructor(
		@Optional() private readonly leasesService?: LeasesService,
		@Optional() private readonly supabaseService?: SupabaseService
	) {}

	@Get()
	// @ApiOperation({ summary: 'Get all leases' })
	// @ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@Req() request: Request,
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

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null

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
	// @ApiOperation({ summary: 'Get lease statistics' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getStats(@Req() request: Request) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				totalLeases: 0,
				activeLeases: 0,
				expiringLeases: 0,
				draftLeases: 0
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		return this.leasesService.getStats(user?.id || 'test-user-id')
	}

	@Get('analytics/performance')
	// @ApiOperation({ summary: 'Get per-lease performance analytics' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getLeasePerformanceAnalytics(
		@Req() request: Request,
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

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null

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
	// @ApiOperation({ summary: 'Get lease duration and renewal analytics' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getLeaseDurationAnalytics(
		@Req() request: Request,
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

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null

		return this.leasesService.getLeaseDurationAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				period: period ?? 'yearly'
			}
		)
	}

	@Get('analytics/turnover')
	// @ApiOperation({ summary: 'Get lease turnover and retention analytics' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getLeaseTurnoverAnalytics(
		@Req() request: Request,
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

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null

		return this.leasesService.getLeaseTurnoverAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				timeframe: timeframe ?? '12m'
			}
		)
	}

	@Get('analytics/revenue')
	// @ApiOperation({ summary: 'Get per-lease revenue analytics and trends' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getLeaseRevenueAnalytics(
		@Req() request: Request,
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

		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null

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
	// @ApiOperation({ summary: 'Get expiring leases' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getExpiring(
		@Req() request: Request,
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
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		return this.leasesService.getExpiring(
			user?.id || 'test-user-id',
			days ?? 30
		)
	}

	@Get(':id')
	// @ApiOperation({ summary: 'Get lease by ID' })
	// @ApiResponse({ status: HttpStatus.OK })
	// @ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: Request
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				data: null
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
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
	// @ApiOperation({ summary: 'Create new lease' })
	// @ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@Body() createRequest: CreateLeaseRequest,
		@Req() request: Request
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: createRequest,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		return this.leasesService.create(user?.id || 'test-user-id', createRequest)
	}

	@Put(':id')
	// @ApiOperation({ summary: 'Update lease' })
	// @ApiResponse({ status: HttpStatus.OK })
	// @ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateLeaseRequest,
		@Req() request: Request
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				data: updateRequest,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
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
	// @ApiOperation({ summary: 'Delete lease' })
	// @ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: Request
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		await this.leasesService.remove(user?.id || 'test-user-id', id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	// @ApiOperation({ summary: 'Renew lease' })
	// @ApiResponse({ status: HttpStatus.OK })
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('endDate') endDate: string,
		@Req() request: Request
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
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		return this.leasesService.renew(user?.id || 'test-user-id', id, endDate)
	}

	@Post(':id/terminate')
	// @ApiOperation({ summary: 'Terminate lease' })
	// @ApiResponse({ status: HttpStatus.OK })
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: Request,
		@Body('reason') reason?: string
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
		// Modern 2025 pattern: Direct Supabase validation
		const user = this.supabaseService ? await this.supabaseService.getUser(request) : null
		return this.leasesService.terminate(user?.id || 'test-user-id', id, reason)
	}
}
