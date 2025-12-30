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
import { ERROR_TYPES } from '@repo/shared/constants/error-codes'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { PropertyAnalyticsService } from './services/property-analytics.service'

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
