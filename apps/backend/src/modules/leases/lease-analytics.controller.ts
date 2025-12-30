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
	Query,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseFinancialService } from './lease-financial.service'
import { isValidUUID } from '@repo/shared/validation/common'

@ApiTags('Leases')
@ApiBearerAuth('supabase-auth')
@Controller('leases')
export class LeaseAnalyticsController {
	constructor(private readonly financialService: LeaseFinancialService) {}

	@ApiOperation({ summary: 'Get lease stats', description: 'Retrieve aggregate lease statistics' })
	@ApiResponse({ status: 200, description: 'Lease statistics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stats')
	async getStats(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.financialService.getStats(token)
	}

	@ApiOperation({ summary: 'Get lease performance analytics', description: 'Retrieve lease performance metrics and trends' })
	@ApiQuery({ name: 'lease_id', required: false, type: 'string', format: 'uuid', description: 'Filter by lease ID' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'timeframe', required: false, enum: ['30d', '90d', '6m', '1y'], description: 'Time range for analytics' })
	@ApiResponse({ status: 200, description: 'Lease performance analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Get lease duration analytics', description: 'Retrieve lease duration trends and patterns' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'period', required: false, enum: ['monthly', 'quarterly', 'yearly'], description: 'Aggregation period' })
	@ApiResponse({ status: 200, description: 'Lease duration analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Get lease turnover analytics', description: 'Retrieve lease turnover rates and patterns' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'timeframe', required: false, enum: ['6m', '12m', '24m', '36m'], description: 'Time range for analytics' })
	@ApiResponse({ status: 200, description: 'Lease turnover analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Get lease revenue analytics', description: 'Retrieve lease revenue trends and breakdown' })
	@ApiQuery({ name: 'lease_id', required: false, type: 'string', format: 'uuid', description: 'Filter by lease ID' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'quarterly'], description: 'Aggregation period' })
	@ApiResponse({ status: 200, description: 'Lease revenue analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
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

	@ApiOperation({ summary: 'Get expiring leases', description: 'Retrieve leases expiring within specified days' })
	@ApiQuery({ name: 'days', required: false, type: 'number', description: 'Number of days to look ahead (1-365)' })
	@ApiResponse({ status: 200, description: 'Expiring leases retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid days parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('expiring')
	async getExpiring(
		@Request() req: AuthenticatedRequest,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		return this.financialService.getExpiring(token, days ?? 30)
	}
}
