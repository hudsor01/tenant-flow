import type {
	DashboardStats,
	PropertyPerformance
} from '@repo/shared/types/core'
import type {
	OccupancyTrendResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'

/**
 * Dashboard Analytics Service Interface
 *
 * RESPONSIBILITY: Complex dashboard calculations via RPC functions
 * - Multi-table aggregations requiring database processing
 * - Complex statistical calculations
 * - Performance-optimized analytics
 *
 * NOT FOR: Simple data retrieval (use repositories instead)
 */
export interface IDashboardAnalyticsService {
	/**
	 * Get comprehensive dashboard statistics
	 * Complex calculation involving multiple tables and aggregations
	 */
	getDashboardStats(userId: string, token?: string): Promise<DashboardStats>

	/**
	 * Get property performance metrics
	 * Multi-table joins with complex calculations
	 */
	getPropertyPerformance(userId: string, token?: string): Promise<PropertyPerformance[]>

	/**
	 * Get occupancy trends over time
	 * Time-series calculations requiring database processing
	 */
	getOccupancyTrends(
		userId: string,
		token?: string,
		months?: number
	): Promise<OccupancyTrendResponse[]>

	/**
	 * Get revenue trends and growth calculations
	 * Complex financial analytics with period comparisons
	 */
	getRevenueTrends(
		userId: string,
		token?: string,
		months?: number
	): Promise<RevenueTrendResponse[]>

	/**
	 * Get maintenance analytics
	 * Aggregations with priority grouping and resolution time calculations
	 */
	getMaintenanceAnalytics(userId: string, token?: string): Promise<{
		avgResolutionTime: number
		completionRate: number
		priorityBreakdown: Record<string, number>
		trendsOverTime: {
			month: string
			completed: number
			avgResolutionDays: number
		}[]
	}>

	/**
	 * Get billing insights with complex aggregations
	 * Multi-table calculations for revenue analytics
	 */
	getBillingInsights(
		userId: string,
		token?: string,
		options?: {
			startDate?: Date
			endDate?: Date
		}
	): Promise<Record<string, unknown>>

	/**
	 * Health check for analytics service
	 */
	isHealthy(): Promise<boolean>
}
