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

	constructor(private readonly supabase: SupabaseService) {}

	private async callRpc<T = unknown>(
		functionName: string,
		payload: Record<string, unknown>
	): Promise<T | null> {
		try {
			const result = await this.supabase.rpcWithRetries(functionName, payload)
			const res = result as {
				data?: T
				error?: { message?: string } | null
			}
			if (res.error) {
				this.logger.warn('Dashboard analytics RPC failed', {
					functionName,
					error: res.error?.message
				})
				return null
			}
			return res.data ?? null
		} catch (error) {
			this.logger.error('Unexpected RPC failure', {
				functionName,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	async getDashboardStats(userId: string): Promise<DashboardStats> {
		try {
			this.logger.log('Calculating dashboard stats via optimized RPC', {
				userId
			})

			// Try primary RPC function first using centralized callRpc (with retries)
			const primary = await this.callRpc<DashboardStats>(
				'get_dashboard_stats',
				{
					user_id_param: userId
				}
			)

			if (primary) return primary

			this.logger.warn(
				'Primary dashboard stats RPC failed, using optimized fallback',
				{
					userId
				}
			)

			// Fallback attempt (may be identical or a different implementation in DB)
			const fallback = await this.callRpc<DashboardStats>(
				'get_dashboard_stats',
				{
					user_id_param: userId
				}
			)

			if (!fallback) {
				this.logger.error('Both primary and fallback dashboard stats failed', {
					userId
				})
				return this.getEmptyDashboardStats()
			}

			return fallback
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

	async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log('Calculating property performance via RPC', { userId })

			const raw = await this.callRpc<PropertyPerformanceRpcResponse[]>(
				'get_property_performance',
				{ p_user_id: userId }
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
				{ p_user_id: userId, p_months: months }
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
				{ p_user_id: userId, p_months: months }
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

	async getMaintenanceAnalytics(userId: string): Promise<{
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
			}>('get_maintenance_analytics', { user_id: userId })

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

			const client = this.supabase.getAdminClient()

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
