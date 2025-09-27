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
import type {
	MaintenanceMetrics,
	MaintenanceCostSummary,
	MaintenancePerformance
} from '@repo/shared'

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
	): Promise<MaintenanceMetrics> {
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
				p_property_id: propertyId || undefined,
				p_start_date: startDate.toISOString().split('T')[0],
				p_end_date: endDate.toISOString().split('T')[0]
			})

		if (error) {
			this.logger.error('Failed to calculate maintenance metrics', error)
			throw new BadRequestException('Failed to fetch maintenance data')
		}

		// Type assertion for the RPC response
		return (data as unknown as MaintenanceMetrics) || {
			totalCost: 0,
			avgCost: 0,
			totalRequests: 0,
			emergencyCount: 0,
			highPriorityCount: 0,
			completedRequests: 0,
			pendingRequests: 0,
			averageResolutionTime: 0
		}
	}

	/**
	 * Get maintenance cost summary with aggregations
	 */
	@Get('cost-summary')
	async getCostSummary(
		@Req() req: Request,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe') timeframe = '30d'
	): Promise<MaintenanceCostSummary> {
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
				p_property_id: propertyId || undefined,
				p_start_date: startDate.toISOString().split('T')[0],
				p_end_date: endDate.toISOString().split('T')[0]
			})

		if (error) {
			this.logger.error('Failed to calculate maintenance cost summary', error)
			throw new BadRequestException('Failed to fetch cost data')
		}

		// Type assertion for the RPC response
		const result = data as unknown as MaintenanceMetrics

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
	): Promise<MaintenancePerformance[]> {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for property performance
		let data, error

		if (propertyId) {
			const result = await client
				.rpc('calculate_property_performance', {
					p_user_id: user.id,
					p_period: period as string,
					p_property_id: propertyId
				})
			data = result.data
			error = result.error
		} else {
			const result = await client
				.rpc('calculate_property_performance', {
					p_user_id: user.id,
					p_period: period as string,
					p_property_id: '' // Default empty string for all properties
				})
			data = result.data
			error = result.error
		}

		if (error) {
			this.logger.error('Failed to calculate performance analytics', error)
			throw new BadRequestException('Failed to fetch performance data')
		}

		// Type assertion for the RPC response
		return (data as unknown as MaintenancePerformance[]) || []
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