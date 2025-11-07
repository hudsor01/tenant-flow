import { Injectable, Logger } from '@nestjs/common'
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
import { IDashboardAnalyticsService } from './interfaces/dashboard-analytics.interface'

/**
 * Dashboard Analytics Service
 *
 * RESPONSIBILITY: Complex dashboard calculations via RPC functions
 * - Multi-table aggregations
 * - Statistical calculations
 * - Performance-optimized analytics using database functions
 */
@Injectable()
export class DashboardAnalyticsService implements IDashboardAnalyticsService {
	private readonly logger = new Logger(DashboardAnalyticsService.name)
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAYS_MS = [1000, 5000, 15000] // 1s, 5s, 15s exponential backoff
	private pendingTimers: Set<NodeJS.Timeout> = new Set()

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get client based on token - centralizes client selection logic
	 */
	private getClientForToken(token?: string) {
		return token
			? this.supabase.getUserClient(token)
			: this.supabase.getAdminClient()
	}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>,
		token?: string,
		attempt: number = 0
	): Promise<T | null> {

		try {
			// Use user-scoped client if token provided (RLS-enforced), otherwise admin
			const client = this.getClientForToken(token)
			
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await (client as any).rpc(functionName, payload)
			const res = result as {
				data?: T
				error?: { message?: string } | null
			}

			if (res.error) {
				this.logger.warn('Dashboard analytics RPC failed', {
					functionName,
					error: res.error?.message,
					attempt: attempt + 1,
					maxRetries: this.MAX_RETRIES
				})

				// Retry with exponential backoff
				if (attempt < this.MAX_RETRIES) {
					const delay = this.RETRY_DELAYS_MS[attempt]
					this.logger.log(
						`Retrying RPC ${functionName} after ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES})`
					)
					await new Promise(resolve => {
						const timer = setTimeout(() => {
							this.pendingTimers.delete(timer)
							resolve(undefined)
						}, delay)
						this.pendingTimers.add(timer)
					})
					return this.callRpc<T>(functionName, payload, token, attempt + 1)
				}

				return null
			}

			return res.data ?? null
		} catch (error) {
			this.logger.error('Unexpected RPC failure', {
				functionName,
				error: error instanceof Error ? error.message : String(error),
				attempt: attempt + 1,
				maxRetries: this.MAX_RETRIES
			})

			// Retry on unexpected errors too
			if (attempt < this.MAX_RETRIES) {
				const delay = this.RETRY_DELAYS_MS[attempt]
				this.logger.log(
					`Retrying RPC ${functionName} after ${delay}ms due to exception (attempt ${attempt + 1}/${this.MAX_RETRIES})`
				)
				await new Promise(resolve => {
					const timer = setTimeout(() => {
						this.pendingTimers.delete(timer)
						resolve(undefined)
					}, delay)
					this.pendingTimers.add(timer)
				})
				return this.callRpc<T>(functionName, payload, token, attempt + 1)
			}

			return null
		}
	}

	async getDashboardStats(userId: string, token?: string): Promise<DashboardStats> {
		try {
			this.logger.log('Calculating dashboard stats via optimized RPC', {
				userId
			})

			// Call RPC with built-in retry logic (3 attempts with exponential backoff)
			const stats = await this.callRpc<DashboardStats>(
				'get_dashboard_stats',
				{
					p_user_id: userId
				},
				token
			)

			if (!stats) {
				this.logger.error('Dashboard stats RPC failed after retries', { userId })
				return this.getEmptyDashboardStats()
			}

			return stats
		} catch (error) {
			this.logger.error(
				`Database error in getDashboardStats: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error
				}
			)

			return this.getEmptyDashboardStats()
		}
	}

	async getPropertyPerformance(userId: string, token?: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log('Calculating property performance via RPC', { userId })

			const raw = await this.callRpc<PropertyPerformanceRpcResponse[]>(
				'get_property_performance',
				{ p_user_id: userId },
				token
			)

			if (!raw) return []

			return raw.map(item => ({
				property: item.property_name,
				propertyId: item.property_id,
				units: item.total_units,
				totalUnits: item.total_units,
				occupiedUnits: item.occupied_units,
				vacantUnits: item.vacant_units,
				occupancy: `${item.occupancy_rate}%`,
				occupancyRate: item.occupancy_rate,
				revenue: item.annual_revenue,
				monthlyRevenue: item.monthly_revenue,
				potentialRevenue: item.potential_revenue,
				address: item.address,
				propertyType: item.property_type,
				status: item.status as 'PARTIAL' | 'VACANT' | 'NO_UNITS' | 'FULL'
			}))
		} catch (error) {
			this.logger.error(
				`Database error in getPropertyPerformance: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error
				}
			)
			return []
		}
	}

	async getOccupancyTrends(
		userId: string,
		token?: string,
		months: number = 12
	): Promise<OccupancyTrendResponse[]> {
		try {
			this.logger.log('Calculating occupancy trends via optimized RPC', {
				userId,
				months
			})

			// Use the actual RPC function instead of fake data
			const raw = await this.callRpc<OccupancyTrendResponse[]>(
				'get_occupancy_trends_optimized',
				{ p_user_id: userId, p_months: months },
				token
			)

			if (!raw || raw.length === 0) {
				this.logger.warn('No occupancy trends data from RPC, returning empty array', {
					userId,
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
					userId,
					error
				}
			)
			return []
		}
	}

	async getRevenueTrends(
		userId: string,
		token?: string,
		months: number = 12
	): Promise<RevenueTrendResponse[]> {
		try {
			this.logger.log('Calculating revenue trends via optimized RPC', {
				userId,
				months
			})

			// Use the actual RPC function instead of fake data
			const raw = await this.callRpc<RevenueTrendResponse[]>(
				'get_revenue_trends_optimized',
				{ p_user_id: userId, p_months: months },
				token
			)

			if (!raw || raw.length === 0) {
				this.logger.warn('No revenue trends data from RPC, returning empty array', {
					userId,
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
					userId,
					error
				}
			)
			return []
		}
	}

	async getMaintenanceAnalytics(userId: string, token?: string): Promise<{
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
				userId
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
			}>('get_maintenance_analytics', { user_id: userId }, token)

			if (!maintenanceRaw) {
				this.logger.error('Failed to calculate maintenance analytics via RPC', {
					userId
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
					userId,
					error
				}
			)
			return EMPTY_MAINTENANCE_ANALYTICS
		}
	}

	async getBillingInsights(
		userId: string,
		token?: string,
		options?: {
			startDate?: Date
			endDate?: Date
		}
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Calculating billing insights via RPC', {
			userId,
			options
		})

		// Use centralized client selection
		const client = this.getClientForToken(token)

		// Simple billing insights (placeholder for now)
			const { data, error } = await client
				.from('property')
				.select('id')
				.eq('ownerId', userId)
				.limit(1)

			if (error) {
				this.logger.error('Failed to calculate billing insights', {
					error,
					userId,
					options
				})
				return {}
			}

			return { placeholder: 'billing_insights', count: data?.length || 0 }
		} catch (error) {
			this.logger.error(
				`Database error in getBillingInsights: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error,
					options
				}
			)
			return {}
		}
	}

	async isHealthy(): Promise<boolean> {
		try {
			const client = this.supabase.getAdminClient()
			// Simple health check - try to query a table
			const { error } = await client.from('property').select('id').limit(1)
			return !error
		} catch (error) {
			this.logger.error(
				'Dashboard analytics service health check failed:',
				error
			)
			return false
		}
	}

	/**
	 * Get time-series data for dashboard charts
	 */
	async getTimeSeries(
		userId: string,
		metric: string,
		days: number,
		token?: string
	): Promise<unknown[]> {
		try {
			this.logger.log('Fetching time-series data via RPC', {
				userId,
				metric,
				days
			})

			const raw = await this.callRpc<unknown[]>(
				'get_dashboard_time_series',
				{
					p_user_id: userId,
					p_metric_name: metric,
					p_days: days
				},
				token
			)

			if (!raw || raw.length === 0) {
				this.logger.warn('No time-series data from RPC, returning empty array', {
					userId,
					metric,
					days
				})
				return []
			}

			return raw
		} catch (error) {
			this.logger.error(
				`Database error in getTimeSeries: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					metric,
					days,
					error
				}
			)
			return []
		}
	}

	/**
	 * Get metric trend comparing current vs previous period
	 */
	async getMetricTrend(
		userId: string,
		metric: string,
		period: string,
		token?: string
	): Promise<unknown> {
		try {
			this.logger.log('Fetching metric trend via RPC', {
				userId,
				metric,
				period
			})

			const raw = await this.callRpc<unknown>(
				'get_metric_trend',
				{
					p_user_id: userId,
					p_metric_name: metric,
					p_period: period
				},
				token
			)

			if (!raw) {
				this.logger.warn('No metric trend data from RPC', {
					userId,
					metric,
					period
				})
				return null
			}

			return raw
		} catch (error) {
			this.logger.error(
				`Database error in getMetricTrend: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					metric,
					period,
					error
				}
			)
			return null
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

	/**
	 * Cleanup pending timers on module destroy
	 */
	async onModuleDestroy() {
		if (this.pendingTimers.size > 0) {
			this.logger.log('Clearing pending retry timers', {
				count: this.pendingTimers.size
			})
			for (const timer of this.pendingTimers) {
				clearTimeout(timer)
			}
			this.pendingTimers.clear()
		}
	}
}
