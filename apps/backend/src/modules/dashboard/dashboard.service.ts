import { Injectable } from '@nestjs/common'
import type {
	DashboardStats,
	DashboardMetricsResponse,
	DashboardSummaryResponse,
	PropertyPerformance,
	SystemUptime
} from '@repo/shared/types/core'
import type {
	OccupancyTrendResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'
import {
	billingInsightsSchema,
	dashboardActivityResponseSchema
} from '@repo/shared/validation/dashboard'
import type { z } from 'zod'
import { DashboardStatsService } from './dashboard-stats.service'
import { DashboardTrendsService } from './dashboard-trends.service'
import { DashboardPerformanceService } from './dashboard-performance.service'

@Injectable()
export class DashboardService {
	constructor(
		private readonly statsService: DashboardStatsService,
		private readonly trendsService: DashboardTrendsService,
		private readonly performanceService: DashboardPerformanceService
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 * Uses repository pattern for clean separation of concerns
	 */
	async getStats(user_id?: string, token?: string): Promise<DashboardStats> {
		return this.statsService.getStats(user_id, token)
	}

	/**
	 * Get recent activity feed using optimized RPC function
	 * PERFORMANCE: Replaces 5 separate queries with single optimized UNION query (4x faster)
	 */
	async getActivity(
		user_id: string,
		token: string
	): Promise<z.infer<typeof dashboardActivityResponseSchema>> {
		return this.trendsService.getActivity(user_id, token)
	}

	/**
	 * Get billing insights - MRR, churn rate, annual revenue
	 */
	async getBillingInsights(
		user_id?: string
	): Promise<z.infer<typeof billingInsightsSchema> | null> {
		return this.trendsService.getBillingInsights(user_id)
	}

	/**
	 * Check if billing insights service is available
	 * Delegates to repository layer for service health check
	 */
	async isBillingInsightsAvailable(
		user_id: string,
		token: string
	): Promise<boolean> {
		return this.trendsService.isBillingInsightsAvailable(user_id, token)
	}

	/**
	 * Get property performance metrics
	 * Delegates to repository layer for clean data access
	 */
	async getPropertyPerformance(
		user_id?: string,
		token?: string
	): Promise<PropertyPerformance[]> {
		return this.performanceService.getPropertyPerformance(user_id, token)
	}

	/**
	 * Get system uptime metrics from database and application
	 * Production implementation using real system data
	 */
	async getUptime(): Promise<SystemUptime> {
		return this.statsService.getUptime()
	}

	/**
	 * Get dashboard metrics - replaces get_dashboard_metrics function
	 * Uses repository pattern instead of database function
	 */
	async getMetrics(
		user_id: string,
		token?: string
	): Promise<DashboardMetricsResponse> {
		return this.statsService.getMetrics(user_id, token)
	}

	/**
	 * Get dashboard summary - replaces get_dashboard_summary function
	 * Uses repository pattern instead of database function
	 */
	async getSummary(
		user_id: string,
		token?: string
	): Promise<DashboardSummaryResponse> {
		return this.statsService.getSummary(user_id, token)
	}

	/**
	 * Get occupancy trends using optimized RPC function
	 */
	async getOccupancyTrends(
		user_id?: string,
		token?: string,
		months?: number
	): Promise<OccupancyTrendResponse[]> {
		return this.trendsService.getOccupancyTrends(user_id, token, months)
	}

	/**
	 * Get revenue trends using optimized RPC function
	 */
	async getRevenueTrends(
		user_id?: string,
		token?: string,
		months?: number
	): Promise<RevenueTrendResponse[]> {
		return this.trendsService.getRevenueTrends(user_id, token, months)
	}

	/**
	 * Get maintenance analytics using optimized RPC function
	 */
	async getMaintenanceAnalytics(
		user_id?: string
	): Promise<{
		avgResolutionTime: number
		completionRate: number
		priorityBreakdown: Record<string, number>
		trendsOverTime: {
			month: string
			completed: number
			avgResolutionDays: number
		}[]
	}> {
		return this.trendsService.getMaintenanceAnalytics(user_id)
	}
}
