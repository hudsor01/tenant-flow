import {
	BadRequestException,
	Controller,
	Get,
	Logger,
	Query,
	Req
} from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'

/**
 * Maintenance Analytics Controller
 * All maintenance calculations moved from frontend to backend using PostgreSQL RPC
 * Replaces calculations from maintenance-analytics.tsx lines 224-238, 266
 */
@Controller('maintenance/analytics')
export class MaintenanceAnalyticsController {
	private readonly logger = new Logger(MaintenanceAnalyticsController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get maintenance metrics with all calculations done server-side
	 * Replaces frontend calculations from maintenance-analytics.tsx
	 */
	@Get('metrics')
	async getMaintenanceMetrics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d',
		@Query('status') _status?: string
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Parse timeframe to get date range
		const daysAgo = this.parseTimeframe(timeframe)
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - daysAgo)
		const endDate = new Date()

		// Use PostgreSQL RPC function for all calculations
		const { data, error } = await client
			.rpc('calculate_maintenance_metrics', {
				p_user_id: user.id,
				p_property_id: propertyId || null,
				p_start_date: startDate.toISOString().split('T')[0],
				p_end_date: endDate.toISOString().split('T')[0]
			})

		if (error) {
			this.logger.error('Failed to calculate maintenance metrics', error)
			throw new BadRequestException('Failed to fetch maintenance data')
		}

		return data
	}

	/**
	 * Get maintenance cost summary with aggregations
	 */
	@Get('cost-summary')
	async getCostSummary(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d'
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Parse timeframe to get date range
		const daysAgo = this.parseTimeframe(timeframe)
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - daysAgo)
		const endDate = new Date()

		// Use PostgreSQL RPC function for cost calculations
		const { data, error } = await client
			.rpc('calculate_maintenance_metrics', {
				p_user_id: user.id,
				p_property_id: propertyId || null,
				p_start_date: startDate.toISOString().split('T')[0],
				p_end_date: endDate.toISOString().split('T')[0]
			})

		if (error) {
			this.logger.error('Failed to calculate maintenance cost summary', error)
			throw new BadRequestException('Failed to fetch cost data')
		}

		// Extract cost-specific data from RPC result
		const result = data

		return {
			totalCost: result.totalCost,
			avgCost: result.avgCost,
			totalRequests: result.totalRequests,
			emergencyCount: result.emergencyCount,
			highPriorityCount: result.highPriorityCount
		}
	}

	/**
	 * Get maintenance performance analytics
	 */
	@Get('performance')
	async getPerformanceAnalytics(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('period') period = 'monthly'
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for property performance
		const { data, error } = await client
			.rpc('calculate_property_performance', {
				p_user_id: user.id,
				p_property_id: propertyId || null,
				p_period: period
			})

		if (error) {
			this.logger.error('Failed to calculate performance analytics', error)
			throw new BadRequestException('Failed to fetch performance data')
		}

		return data
	}

	// Utility method to parse time range
	private parseTimeframe(timeframe: string): number {
		const match = timeframe.match(/^(\d+)([dmy])$/)
		if (!match) return 30 // Default to 30 days

		const [, value, unit] = match
		const numValue = parseInt(value || '30', 10)

		switch (unit) {
			case 'd': return numValue
			case 'm': return numValue * 30
			case 'y': return numValue * 365
			default: return 30
		}
	}
}