import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type {
	DashboardStats,
	PropertyPerformance
} from '@repo/shared/types/core'
import type {
	OccupancyTrendResponse,
	PropertyPerformanceRpcResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'
import { EMPTY_MAINTENANCE_ANALYTICS } from '@repo/shared/constants/empty-states'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import type {
	BillingInsights,
	IDashboardAnalyticsService
} from './interfaces/dashboard-analytics.interface'

/**
 * Dashboard Analytics Service
 *
 * RESPONSIBILITY: Complex dashboard calculations via RPC functions
 * - Multi-table aggregations
 * - Statistical calculations
 * - Performance-optimized analytics using database functions
 *
 * NOTE: All retry logic is handled by SupabaseService.rpcWithRetries()
 * No duplicate retry logic here - single source of truth for retries
 */
@Injectable()
export class DashboardAnalyticsService implements IDashboardAnalyticsService {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Call RPC using centralized retry logic from SupabaseService
	 * Uses admin client for server-side calls (RLS bypassed via service role)
	 * FAIL-FAST: Throws on error instead of returning null to surface issues immediately
	 */
	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T> {
		try {
			const result = await this.supabase.rpcWithRetries(functionName, payload)
			const res = result as { data?: T; error?: { message?: string } | null }

			if (res.error) {
				this.logger.error('Dashboard analytics RPC failed', {
					functionName,
					error: res.error?.message,
					payload
				})
				throw new InternalServerErrorException(
					`Analytics RPC failed: ${functionName}`,
					res.error?.message
					? { cause: res.error, description: res.error.message }
					: { cause: res.error }
				)
			}

			if (res.data === undefined || res.data === null) {
				this.logger.warn('Dashboard analytics RPC returned no data', {
					functionName,
					payload
				})
				throw new InternalServerErrorException(
					`Analytics RPC returned no data: ${functionName}`
				)
			}

			return res.data
		} catch (error) {
			// Re-throw if already an HTTP exception
			if (error instanceof InternalServerErrorException) {
				throw error
			}

			this.logger.error('Unexpected RPC failure', {
				functionName,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new InternalServerErrorException(
				`Unexpected analytics failure: ${functionName}`,
				{ cause: error }
			)
		}
	}

	async getDashboardStats(user_id: string, _token?: string): Promise<DashboardStats> {
		this.logger.log('Calculating dashboard stats via optimized RPC', {
			user_id
		})

		// Call RPC with built-in retry logic (3 attempts with exponential backoff)
		// FAIL-FAST: Let errors propagate to controller for proper HTTP response
		return this.callRpc<DashboardStats>(
			'get_dashboard_stats',
			{ p_user_id: user_id }
		)
	}

	async getPropertyPerformance(
		user_id: string,
		_token?: string
	): Promise<PropertyPerformance[]> {
		this.logger.log('Calculating property performance via optimized RPC', {
			user_id
		})

		// FAIL-FAST: Let errors propagate - no silent empty array returns
		const [rawProperties, rawTrends] = await Promise.all([
			this.callRpc<PropertyPerformanceRpcResponse[]>(
				'get_property_performance_cached',
				{ p_user_id: user_id }
			),
			this.callRpc<
				Array<{
					property_id: string
					current_month_revenue: number
					previous_month_revenue: number
					trend: 'up' | 'down' | 'stable'
					trend_percentage: number
				}>
			>('get_property_performance_trends', { p_user_id: user_id })
		])

		// Create a map of property trends for O(1) lookup
		const trendsMap = new Map(
			rawTrends.map(trend => [trend.property_id, trend])
		)

		return rawProperties.map(item => {
			const trendData = trendsMap.get(item.property_id)

			return {
				property: item.property_name,
				property_id: item.property_id,
				address_line1: item.address,
				totalUnits: item.total_units,
				occupiedUnits: item.occupied_units,
				vacantUnits: item.vacant_units,
				occupancyRate: item.occupancy_rate,
				revenue: item.annual_revenue,
				monthlyRevenue: item.monthly_revenue,
				potentialRevenue: item.potential_revenue,
				property_type: item.property_type,
				status: item.status as 'PARTIAL' | 'VACANT' | 'NO_UNITS' | 'FULL',
				trend: trendData?.trend ?? ('stable' as const),
				trendPercentage: trendData?.trend_percentage ?? 0
			}
		})
	}

	async getOccupancyTrends(
		user_id: string,
		_token?: string,
		months: number = 12
	): Promise<OccupancyTrendResponse[]> {
		try {
			this.logger.log('Calculating occupancy trends via optimized RPC', {
				user_id,
				months
			})

			const raw = await this.callRpc<OccupancyTrendResponse[]>(
				'get_occupancy_trends_optimized',
				{ p_user_id: user_id, p_months: months }
			)

			if (!raw || raw.length === 0) {
				this.logger.warn('No occupancy trends data from RPC, returning empty array', {
					user_id,
					months
				})
				return []
			}

			return raw.map(item => ({
				month: item.month || (item as { period?: string }).period || '',
				occupancy_rate: item.occupancy_rate || 0,
				total_units: item.total_units || 0,
				occupied_units: item.occupied_units || 0
			}))
		} catch (error) {
			this.logger.error(
				`Database error in getOccupancyTrends: ${error instanceof Error ? error.message : String(error)}`,
				{
					user_id,
					error
				}
			)
			return []
		}
	}

	async getRevenueTrends(
		user_id: string,
		_token?: string,
		months: number = 12
	): Promise<RevenueTrendResponse[]> {
		try {
			this.logger.log('Calculating revenue trends via optimized RPC', {
				user_id,
				months
			})

			const raw = await this.callRpc<RevenueTrendResponse[]>(
				'get_revenue_trends_optimized',
				{ p_user_id: user_id, p_months: months }
			)

			if (!raw || raw.length === 0) {
				this.logger.warn('No revenue trends data from RPC, returning empty array', {
					user_id,
					months
				})
				return []
			}

			return raw.map(item => ({
				month: item.month || (item as { period?: string }).period || '',
				revenue: typeof item.revenue === 'number' ? item.revenue : parseFloat(item.revenue) || 0,
				growth: item.growth || 0,
				previous_period_revenue: typeof item.previous_period_revenue === 'number'
					? item.previous_period_revenue
					: parseFloat(item.previous_period_revenue) || 0
			}))
		} catch (error) {
			this.logger.error(
				`Database error in getRevenueTrends: ${error instanceof Error ? error.message : String(error)}`,
				{
					user_id,
					error
				}
			)
			return []
		}
	}

	async getMaintenanceAnalytics(user_id: string): Promise<{
		avgResolutionTime: number
		completionRate: number
		priorityBreakdown: Record<string, number>
		trendsOverTime: {
			month: string
			completed: number
			avgResolutionDays: number
		}[]
	}> {
		try {
			this.logger.log('Calculating maintenance analytics via optimized RPC', {
				user_id
			})

			const maintenanceRaw = await this.callRpc<{
				avgResolutionTime: number
				completionRate: number
				priorityBreakdown: Record<string, number>
				trendsOverTime: Array<{
					month: string
					completed: number
					avgResolutionDays: number
				}>
			}>('get_maintenance_analytics', {
				// Supabase function signature is (user_id uuid); p_user_id was causing PGRST202
				user_id: user_id
			})

			if (!maintenanceRaw) {
				this.logger.error('Failed to calculate maintenance analytics via RPC', {
					user_id
				})
				return {
					avgResolutionTime: 0,
					completionRate: 0,
					priorityBreakdown: {},
					trendsOverTime: []
				}
			}

			const result = maintenanceRaw

			return {
				avgResolutionTime: result.avgResolutionTime || 0,
				completionRate: result.completionRate || 0,
				priorityBreakdown: result.priorityBreakdown || {},
				trendsOverTime: result.trendsOverTime || []
			}
		} catch (error) {
			this.logger.error(
				`Database error in getMaintenanceAnalytics: ${error instanceof Error ? error.message : String(error)}`,
				{
					user_id,
					error
				}
			)
			return EMPTY_MAINTENANCE_ANALYTICS
		}
	}

	async getBillingInsights(user_id: string): Promise<BillingInsights> {
		try {
			this.logger.log('Calculating billing insights via RPC', { user_id })

			const data = await this.callRpc<BillingInsights>(
				'get_billing_insights',
				{ p_user_id: user_id }
			)

			if (!data) {
				this.logger.warn('Billing insights RPC failed, returning defaults', { user_id })
				return { totalRevenue: 0, churnRate: 0, mrr: 0 }
			}

			return data
		} catch (error) {
			this.logger.error(
				`Database error in getBillingInsights: ${error instanceof Error ? error.message : String(error)}`,
				{ user_id, error }
			)
			return { totalRevenue: 0, churnRate: 0, mrr: 0 }
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			const client = this.supabase.getAdminClient()
			// Simple health check - try to query a table
			const { error } = await client.from('properties').select('id').limit(1)
			return !error
		} catch (error) {
			this.logger.error(
				'Dashboard analytics service health check failed:',
				{ error }
			)
			return false
		}
	}

	/**
	 * Helper method to return empty dashboard stats for fallback
	 */
	private getEmptyDashboardStats(): DashboardStats {
		return {
			properties: {
				total: 0,
				occupied: 0,
				vacant: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0,
				averageRent: 0
			},
			tenants: {
				total: 0,
				active: 0,
				inactive: 0,
				newThisMonth: 0
			},
			units: {
				total: 0,
				occupied: 0,
				vacant: 0,
				maintenance: 0,
				averageRent: 0,
				available: 0,
				occupancyRate: 0,
				occupancyChange: 0,
				totalPotentialRent: 0,
				totalActualRent: 0
			},
			leases: {
				total: 0,
				active: 0,
				expired: 0,
				expiringSoon: 0
			},
			maintenance: {
				total: 0,
				open: 0,
				inProgress: 0,
				completed: 0,
				completedToday: 0,
				avgResolutionTime: 0,
				byPriority: {
					low: 0,
					medium: 0,
					high: 0,
					emergency: 0
				}
			},
			revenue: {
				monthly: 0,
				yearly: 0,
				growth: 0
			}
		}
	}
}