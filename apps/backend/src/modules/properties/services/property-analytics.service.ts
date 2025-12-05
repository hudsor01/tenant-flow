import {
	BadRequestException,
	Injectable
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import type { PropertyPerformanceData } from '@repo/shared/src/types/financial-statements.js'
import { PropertyOccupancyAnalyticsService } from './property-occupancy-analytics.service'
import { PropertyFinancialAnalyticsService } from './property-financial-analytics.service'
import { PropertyMaintenanceAnalyticsService } from './property-maintenance-analytics.service'
import { AppLogger } from '../../../logger/app-logger.service'

// Validation constants
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

/**
 * Property Analytics Service
 *
 * Orchestrates property analytics across performance, occupancy, financial, and maintenance.
 * Delegates to focused analytics services for specific domain calculations.
 */
@Injectable()
export class PropertyAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly occupancyService: PropertyOccupancyAnalyticsService,
		private readonly financialService: PropertyFinancialAnalyticsService,
		private readonly maintenanceService: PropertyMaintenanceAnalyticsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Parse timeframe string to date range
	 */
	private parseTimeframe(timeframe: string): { start: Date; end: Date } {
		const now = new Date()
		const days = parseInt(timeframe.replace('d', ''), 10)
		const start = new Date(now)
		start.setDate(now.getDate() - days)
		return { start, end: now }
	}

	/**
	 * Get property performance analytics
	 * Performance metrics per property (occupancy, revenue, expenses)
	 */
	async getPropertyPerformanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string; limit?: number }
	): Promise<PropertyPerformanceData[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:PERFORMANCE:START] Performance analytics request received',
			{
				user_id,
				property_id: query.property_id,
				timeframe: query.timeframe,
				limit: query.limit
			}
		)

		// Validate using constant
		if (
			!VALID_TIMEFRAMES.includes(
				query.timeframe as (typeof VALID_TIMEFRAMES)[number]
			)
		) {
			this.logger.warn('[ANALYTICS:PERFORMANCE:VALIDATION] Invalid timeframe', {
				user_id,
				timeframe: query.timeframe
			})
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}

		// SECURITY: Verify property ownership before calling RPC
		if (query.property_id) {
			this.logger.debug(
				'[ANALYTICS:PERFORMANCE:SECURITY] Verifying property access',
				{
					user_id,
					property_id: query.property_id
				}
			)

			const { data: property } = await this.getPropertyForUser(
				req,
				query.property_id
			)
			if (!property) {
				this.logger.warn('[ANALYTICS:PERFORMANCE:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}

			this.logger.debug(
				'[ANALYTICS:PERFORMANCE:SECURITY] Property access verified',
				{
					user_id,
					property_id: query.property_id
				}
			)
		}

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:PERFORMANCE] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}
		const client = this.supabase.getUserClient(token)

		const { data, error } = await (client as any).rpc( // eslint-disable-line @typescript-eslint/no-explicit-any
			'get_property_performance_analytics',
			{
				p_user_id: user_id,
				p_property_id: query.property_id ?? null,
				p_timeframe: query.timeframe,
				p_limit: query.limit ?? null
			}
		)

		if (error) {
			this.logger.warn('[ANALYTICS:PERFORMANCE] RPC failed', {
				user_id,
				error
			})
			return []
		}

		const toNumber = (value: unknown) =>
			typeof value === 'number' && Number.isFinite(value)
				? value
				: Number(value ?? 0) || 0

		const result: PropertyPerformanceData[] = (Array.isArray(data) ? data : [])
			.filter((item) => Boolean((item as { property_id?: string }).property_id))
			.map((item) => {
				const castItem = item as {
					property_id?: string
					property_name?: string
					propertyName?: string
					name?: string
					occupancy_rate?: unknown
					occupancyRate?: unknown
					total_revenue?: unknown
					totalRevenue?: unknown
					total_expenses?: unknown
					totalExpenses?: unknown
					net_income?: unknown
					netIncome?: unknown
					timeframe?: string
				}
				return {
					property_id: castItem.property_id as string,
					property_name:
						castItem.property_name ??
						castItem.propertyName ??
						castItem.name ??
						'Unknown property',
					occupancy_rate: toNumber(
						castItem.occupancy_rate ?? castItem.occupancyRate
					),
					total_revenue: toNumber(
						castItem.total_revenue ?? castItem.totalRevenue
					),
					total_expenses: toNumber(
						castItem.total_expenses ?? castItem.totalExpenses
					),
					net_income: toNumber(castItem.net_income ?? castItem.netIncome),
					timeframe: castItem.timeframe ?? query.timeframe
				}
			})

		this.logger.log(
			'[ANALYTICS:PERFORMANCE:COMPLETE] Performance analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)
		return result
	}

	/**
	 * Get property occupancy analytics - delegates to occupancy service
	 */
	async getPropertyOccupancyAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; period?: string }
	) {
		return this.occupancyService.getPropertyOccupancyAnalytics(
			req,
			query,
			this.getPropertyForUser.bind(this)
		)
	}

	/**
	 * Get property financial analytics - delegates to financial service
	 */
	async getPropertyFinancialAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string }
	) {
		return this.financialService.getPropertyFinancialAnalytics(
			req,
			query,
			this.getPropertyForUser.bind(this)
		)
	}

	/**
	 * Get property maintenance analytics - delegates to maintenance service
	 */
	async getPropertyMaintenanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string }
	) {
		return this.maintenanceService.getPropertyMaintenanceAnalytics(
			req,
			query,
			this.getPropertyForUser.bind(this)
		)
	}

	/**
	 * Private helper: Get single property for authenticated user
	 * Verifies ownership and returns property data
	 */
	private async getPropertyForUser(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<{ data: { id: string } | null }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Property lookup requested without auth token', {
				property_id
			})
			return { data: null }
		}

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('id', property_id)
			.single()

		if (error || !data) {
			this.logger.warn('Property not found or access denied', {
				property_id,
				error
			})
			return { data: null }
		}

		return { data }
	}
}
