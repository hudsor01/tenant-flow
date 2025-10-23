/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
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
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req
} from '@nestjs/common'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest
} from '@repo/shared/types/backend-domain'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeasesService } from './leases.service'

@Controller('leases')
export class LeasesController {
	constructor(@Optional() private readonly leasesService?: LeasesService) {}

	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id

		return this.leasesService.findAll(userId, {
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
	async getStats(@Req() req: AuthenticatedRequest) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				totalLeases: 0,
				activeLeases: 0,
				expiredLeases: 0,
				terminatedLeases: 0,
				expiringLeases: 0,
				totalMonthlyRent: 0,
				averageRent: 0,
				totalSecurityDeposits: 0
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.leasesService.getStats(userId)
	}

	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id

		return this.leasesService.getAnalytics(userId, {
			...(leaseId ? { leaseId } : {}),
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id

		return this.leasesService.getAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			timeframe: '90d',
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id

		return this.leasesService.getAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id

		return this.leasesService.getAnalytics(userId, {
			...(leaseId ? { leaseId } : {}),
			...(propertyId ? { propertyId } : {}),
			timeframe: '90d',
			period: period ?? 'monthly'
		})
	}

	@Get('expiring')
	async getExpiring(
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id
		return this.leasesService.getExpiring(userId, days ?? 30)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				data: undefined
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		const lease = await this.leasesService.findOne(userId, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	async create(
		@Body() createRequest: CreateLeaseRequest,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				data: createRequest,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		return this.leasesService.create(userId, createRequest)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateLeaseRequest,
		@Req() req: AuthenticatedRequest
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
		const userId = req.user.id
		const lease = await this.leasesService.update(userId, id, updateRequest)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.leasesService) {
			return {
				message: 'Leases service not available',
				id,
				success: false
			}
		}
		// Modern 2025 pattern: Direct Supabase validation
		const userId = req.user.id
		await this.leasesService.remove(userId, id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('endDate') endDate: string,
		@Req() req: AuthenticatedRequest
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
		const userId = req.user.id
		return this.leasesService.renew(userId, id, endDate)
	}

	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
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
		const userId = req.user.id
		return this.leasesService.terminate(
			userId,
			id,
			new Date().toISOString(),
			reason
		)
	}
}
