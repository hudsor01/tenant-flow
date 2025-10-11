import { Injectable, Logger } from '@nestjs/common'
import type {
	DashboardStats,
	PropertyPerformance,
	SystemUptime
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../../modules/analytics/dashboard-analytics.service'
import type {
	Activity,
	ActivityQueryOptions
} from '../interfaces/activity-repository.interface'
import {
	BillingInsightsOptions,
	IDashboardRepository
} from '../interfaces/dashboard-repository.interface'

/**
 * Supabase Dashboard Repository
 *
 * CLEAR SEPARATION OF RESPONSIBILITIES:
 * - Simple data retrieval → Repository (direct table queries)
 * - Complex calculations → Analytics Service (RPC functions)
 */
@Injectable()
export class SupabaseDashboardRepository implements IDashboardRepository {
	private readonly logger = new Logger(SupabaseDashboardRepository.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly dashboardAnalytics: DashboardAnalyticsService
	) {}

	async getStats(userId: string): Promise<DashboardStats> {
		try {
			this.logger.log(
				'Delegating dashboard stats calculation to analytics service',
				{ userId }
			)

			// DELEGATION: Complex calculations moved to analytics service via RPC
			return await this.dashboardAnalytics.getDashboardStats(userId)
		} catch (error) {
			this.logger.error(
				`Error getting dashboard stats: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error
				}
			)
			throw error
		}
	}

	async getActivity(
		userId: string,
		options?: ActivityQueryOptions
	): Promise<{ activities: Activity[] }> {
		try {
			this.logger.log('Fetching dashboard activity via DIRECT table query', {
				userId
			})

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('activity')
				.select('*')
				.eq('userId', userId)
				.order('createdAt', { ascending: false })
				.limit(options?.limit || 20)

			if (error) {
				this.logger.error('Failed to get activity from repository', {
					userId,
					error: error.message
				})
				return { activities: [] }
			}

			return { activities: (data || []) as Activity[] }
		} catch (error) {
			this.logger.error(
				`Database error in getActivity: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error
				}
			)
			return { activities: [] }
		}
	}

	async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log(
				'Delegating property performance calculation to analytics service',
				{ userId }
			)

			// DELEGATION: Complex multi-table calculations moved to analytics service via RPC
			return await this.dashboardAnalytics.getPropertyPerformance(userId)
		} catch (error) {
			this.logger.error(
				`Error getting property performance: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error
				}
			)
			throw error
		}
	}

	async getUptime(): Promise<SystemUptime> {
		// Return static uptime data since we don't have a system uptime table
		return {
			uptime: '99.9%',
			uptimePercentage: 99.9,
			sla: '99.5%',
			slaStatus: 'excellent',
			status: 'operational',
			lastIncident: null,
			responseTime: 150,
			timestamp: new Date().toISOString()
		}
	}

	async getBillingInsights(
		userId: string,
		options?: BillingInsightsOptions
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log(
				'Delegating billing insights calculation to analytics service',
				{ userId, options }
			)

			// DELEGATION: Complex billing calculations moved to analytics service via RPC
			return await this.dashboardAnalytics.getBillingInsights(userId, {
				startDate: options?.startDate,
				endDate: options?.endDate
			})
		} catch (error) {
			this.logger.error(
				`Error getting billing insights: ${error instanceof Error ? error.message : String(error)}`,
				{
					userId,
					error,
					options
				}
			)
			return {}
		}
	}

	async isBillingInsightsAvailable(): Promise<boolean> {
		// Always return true since we're using direct table queries
		return true
	}
}
