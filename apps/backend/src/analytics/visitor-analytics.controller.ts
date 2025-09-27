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
 * Visitor Analytics Controller
 * All visitor/property interest calculations moved from frontend to backend
 * Replaces calculations from visitor-analytics-chart.tsx lines 103-145
 */
@Controller('analytics/visitor')
export class VisitorAnalyticsController {
	private readonly logger = new Logger(VisitorAnalyticsController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get property interest analytics using PostgreSQL RPC function
	 * Replaces frontend calculations from visitor-analytics-chart.tsx
	 */
	@Get('property-interest')
	async getPropertyInterest(
		@Req() req: Request,
		@Query('timeRange') timeRange = '30d',
		@Query('propertyId') propertyId?: string
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for visitor analytics
		const { data, error } = await client
			.rpc('get_visitor_analytics', {
				p_user_id: user.id,
				p_time_range: timeRange,
				p_property_id: propertyId
			})

		if (error) {
			this.logger.error('Failed to get visitor analytics', error)
			throw new BadRequestException('Failed to fetch visitor analytics')
		}

		return data
	}

	/**
	 * Get inquiry conversion metrics using PostgreSQL RPC function
	 */
	@Get('inquiry-metrics')
	async getInquiryMetrics(
		@Req() req: Request,
		@Query('timeRange') timeRange = '30d',
		@Query('propertyId') propertyId?: string
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for inquiry metrics
		const { data, error } = await client
			.rpc('get_visitor_analytics', {
				p_user_id: user.id,
				p_time_range: timeRange,
				p_property_id: propertyId
			})

		if (error) {
			this.logger.error('Failed to get inquiry metrics', error)
			throw new BadRequestException('Failed to fetch inquiry metrics')
		}

		return data
	}

	/**
	 * Get viewing conversion metrics using PostgreSQL RPC function
	 */
	@Get('viewing-metrics')
	async getViewingMetrics(
		@Req() req: Request,
		@Query('timeRange') timeRange = '30d',
		@Query('propertyId') propertyId?: string
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for viewing metrics
		const { data, error } = await client
			.rpc('get_visitor_analytics', {
				p_user_id: user.id,
				p_time_range: timeRange,
				p_property_id: propertyId
			})

		if (error) {
			this.logger.error('Failed to get viewing metrics', error)
			throw new BadRequestException('Failed to fetch viewing metrics')
		}

		return data
	}

	/**
	 * Get comparative analytics using PostgreSQL RPC function
	 */
	@Get('comparative')
	async getComparativeAnalytics(
		@Query('currentPeriod') currentPeriod = '30d',
		@Query('previousPeriod') previousPeriod = '30d',
		@Req() req: Request
	) {
		const user = await this.supabaseService.getUser(req)
		if (!user) {
			throw new BadRequestException('User not authenticated')
		}

		const client = this.supabaseService.getAdminClient()

		// Use PostgreSQL RPC function for comparative analytics
		const { data, error } = await client
			.rpc('get_visitor_analytics', {
				p_user_id: user.id,
				p_time_range: currentPeriod,
				p_previous_period: previousPeriod
			})

		if (error) {
			this.logger.error('Failed to get comparative analytics', error)
			throw new BadRequestException('Failed to fetch comparative analytics')
		}

		return data
	}

}