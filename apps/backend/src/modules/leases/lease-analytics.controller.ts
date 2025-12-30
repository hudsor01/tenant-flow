/**
 * Lease Analytics Controller
 *
 * Handles all lease analytics endpoints:
 * - GET /leases/analytics/performance
 * - GET /leases/analytics/duration
 * - GET /leases/analytics/turnover
 * - GET /leases/analytics/revenue
 * - GET /leases/expiring
 *
 * Extracted from LeasesController to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Controller,
	DefaultValuePipe,
	Get,
	ParseIntPipe,
	Query
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { LeaseFinancialService } from './lease-financial.service'
import { isValidUUID } from '@repo/shared/validation/common'

@Controller('leases')
export class LeaseAnalyticsController {
	constructor(private readonly financialService: LeaseFinancialService) {}

	@Get('stats')
	async getStats(@JwtToken() token: string) {
		return this.financialService.getStats(token)
	}

	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		// Validate UUIDs if provided
		if (lease_id && !isValidUUID(lease_id)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['30d', '90d', '6m', '1y'].includes(timeframe ?? '90d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 30d, 90d, 6m, 1y'
			)
		}

		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['monthly', 'quarterly', 'yearly'].includes(period ?? 'yearly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: monthly, quarterly, yearly'
			)
		}

		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: '90d',
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['6m', '12m', '24m', '36m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 6m, 12m, 24m, 36m'
			)
		}

		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate UUIDs if provided
		if (lease_id && !isValidUUID(lease_id)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['weekly', 'monthly', 'quarterly'].includes(period ?? 'monthly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: weekly, monthly, quarterly'
			)
		}

		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
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
		return this.financialService.getExpiring(token, days ?? 30)
	}
}
