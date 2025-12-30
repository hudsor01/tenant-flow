/**
 * Property Analytics Controller
 *
 * Handles all property analytics endpoints:
 * - GET /properties/analytics/performance
 * - GET /properties/analytics/occupancy
 * - GET /properties/analytics/financial
 * - GET /properties/analytics/maintenance
 *
 * Extracted from PropertiesController to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Controller,
	DefaultValuePipe,
	Get,
	ParseIntPipe,
	ParseUUIDPipe,
	Query,
	Request
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { ERROR_TYPES } from '@repo/shared/constants/error-codes'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { PropertyAnalyticsService } from './services/property-analytics.service'

@ApiTags('Properties')
@ApiBearerAuth('supabase-auth')
@Controller('properties/analytics')
export class PropertyAnalyticsController {
	constructor(
		private readonly propertyAnalyticsService: PropertyAnalyticsService
	) {}

	/**
	 * GET /properties/analytics/performance
	 * Get per-property analytics and performance metrics
	 * Returns detailed metrics for each property
	 */
	@ApiOperation({ summary: 'Get performance analytics', description: 'Retrieve per-property analytics and performance metrics' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'timeframe', required: false, enum: ['7d', '30d', '90d', '1y'], description: 'Time range for analytics' })
	@ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Maximum number of results' })
	@ApiResponse({ status: 200, description: 'Performance analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid timeframe parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('performance')
	async getPropertyPerformanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id', new ParseUUIDPipe({ optional: true }))
		property_id?: string,
		@Query('timeframe', new DefaultValuePipe('30d')) timeframe?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
	) {
		// Validate timeframe
		if (!['7d', '30d', '90d', '1y'].includes(timeframe ?? '30d')) {
			throw new BadRequestException({
				code: ERROR_TYPES.VALIDATION_ERROR,
				message: 'Invalid timeframe. Must be one of: 7d, 30d, 90d, 1y'
			})
		}

		return this.propertyAnalyticsService.getPropertyPerformanceAnalytics(req, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '30d',
			...(limit !== undefined ? { limit } : {})
		})
	}

	/**
	 * GET /properties/analytics/occupancy
	 * Get property occupancy trends and analytics
	 * Tracks occupancy rates over time per property
	 */
	@ApiOperation({ summary: 'Get occupancy analytics', description: 'Retrieve property occupancy trends and rates over time' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'yearly'], description: 'Aggregation period' })
	@ApiResponse({ status: 200, description: 'Occupancy analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid period parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('occupancy')
	async getPropertyOccupancyAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id', new ParseUUIDPipe({ optional: true }))
		property_id?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate period
		if (
			!['daily', 'weekly', 'monthly', 'yearly'].includes(period ?? 'monthly')
		) {
			throw new BadRequestException({
				code: ERROR_TYPES.VALIDATION_ERROR,
				message:
					'Invalid period. Must be one of: daily, weekly, monthly, yearly'
			})
		}

		return this.propertyAnalyticsService.getPropertyOccupancyAnalytics(req, {
			...(property_id ? { property_id } : {}),
			period: period ?? 'monthly'
		})
	}

	/**
	 * GET /properties/analytics/financial
	 * Get property financial analytics
	 * Revenue, expenses, and profitability per property
	 */
	@ApiOperation({ summary: 'Get financial analytics', description: 'Retrieve property revenue, expenses, and profitability metrics' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'timeframe', required: false, enum: ['3m', '6m', '12m', '24m'], description: 'Time range for analytics' })
	@ApiResponse({ status: 200, description: 'Financial analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid timeframe parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('financial')
	async getPropertyFinancialAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id', new ParseUUIDPipe({ optional: true }))
		property_id?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate timeframe
		if (!['3m', '6m', '12m', '24m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException({
				code: ERROR_TYPES.VALIDATION_ERROR,
				message: 'Invalid timeframe. Must be one of: 3m, 6m, 12m, 24m'
			})
		}

		return this.propertyAnalyticsService.getPropertyFinancialAnalytics(req, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	/**
	 * GET /properties/analytics/maintenance
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 */
	@ApiOperation({ summary: 'Get maintenance analytics', description: 'Retrieve property maintenance costs, frequency, and trends' })
	@ApiQuery({ name: 'property_id', required: false, type: 'string', format: 'uuid', description: 'Filter by property ID' })
	@ApiQuery({ name: 'timeframe', required: false, enum: ['1m', '3m', '6m', '12m'], description: 'Time range for analytics' })
	@ApiResponse({ status: 200, description: 'Maintenance analytics retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Invalid timeframe parameter' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('maintenance')
	async getPropertyMaintenanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('property_id', new ParseUUIDPipe({ optional: true }))
		property_id?: string,
		@Query('timeframe', new DefaultValuePipe('6m')) timeframe?: string
	) {
		// Validate timeframe
		if (!['1m', '3m', '6m', '12m'].includes(timeframe ?? '6m')) {
			throw new BadRequestException({
				code: ERROR_TYPES.VALIDATION_ERROR,
				message: 'Invalid timeframe. Must be one of: 1m, 3m, 6m, 12m'
			})
		}

		return this.propertyAnalyticsService.getPropertyMaintenanceAnalytics(req, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '6m'
		})
	}
}
