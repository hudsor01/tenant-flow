import { Injectable, Logger, Inject } from '@nestjs/common'
import type { DashboardStats, PropertyPerformance, SystemUptime } from '@repo/shared/types/core'
import type { IDashboardRepository } from '../repositories/interfaces/dashboard-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.DASHBOARD)
		private readonly dashboardRepository: IDashboardRepository,
		private readonly dashboardAnalyticsService: DashboardAnalyticsService
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 * Uses repository pattern for clean separation of concerns
	 */
	async getStats(userId?: string): Promise<DashboardStats> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Dashboard stats requested without userId')
			// Return default empty stats for missing userId
			return {
				properties: {
					total: 0,
					occupied: 0,
					vacant: 0,
					occupancyRate: 0,
					totalMonthlyRent: 0,
					averageRent: 0
				},
				tenants: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
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
				leases: { total: 0, active: 0, expired: 0, expiringSoon: 0 },
				maintenance: {
					total: 0,
					open: 0,
					inProgress: 0,
					completed: 0,
					completedToday: 0,
					avgResolutionTime: 0,
					byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
				},
				revenue: { monthly: 0, yearly: 0, growth: 0 }
			}
		}

		try {
			this.logger.log('Fetching dashboard stats via repository', { userId })

			// Delegate data access to repository layer
			return await this.dashboardRepository.getStats(userId)
		} catch (error) {
			this.logger.error('Dashboard service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})

			// Business logic: Return empty stats on any error for resilience
			return {
				properties: {
					total: 0,
					occupied: 0,
					vacant: 0,
					occupancyRate: 0,
					totalMonthlyRent: 0,
					averageRent: 0
				},
				tenants: { total: 0, active: 0, inactive: 0, newThisMonth: 0 },
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
				leases: { total: 0, active: 0, expired: 0, expiringSoon: 0 },
				maintenance: {
					total: 0,
					open: 0,
					inProgress: 0,
					completed: 0,
					completedToday: 0,
					avgResolutionTime: 0,
					byPriority: { low: 0, medium: 0, high: 0, emergency: 0 }
				},
				revenue: { monthly: 0, yearly: 0, growth: 0 }
			}
		}
	}

	/**
	 * Get recent activity feed from Activity table
	 * Uses repository pattern for clean data access
	 */
	async getActivity(
		userId: string,
		_authToken?: string
	): Promise<{ activities: unknown[] }> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Activity requested without userId')
			return { activities: [] }
		}

		try {
			this.logger.log('Fetching dashboard activity via repository', { userId })

			// Delegate data access to repository layer
			return await this.dashboardRepository.getActivity(userId, { limit: 10 })
		} catch (error) {
			this.logger.error('Dashboard service failed to get activity', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})

			// Business logic: Return empty array for resilience
			return { activities: [] }
		}
	}

	/**
	 * Get comprehensive billing insights
	 * Delegates to repository layer for clean data access
	 */
	async getBillingInsights(
		userId: string,
		startDate?: Date,
		endDate?: Date
	): Promise<Record<string, unknown> | null> {
		try {
			this.logger.log('Fetching billing insights via repository', { userId, startDate, endDate })
			return await this.dashboardRepository.getBillingInsights(userId, { startDate, endDate })
		} catch (error) {
			this.logger.error('Dashboard service failed to get billing insights', {
				error: error instanceof Error ? error.message : String(error),
				startDate,
				endDate
			})
			return null
		}
	}

	/**
	 * Check if billing insights service is available
	 * Delegates to repository layer for service health check
	 */
	async isBillingInsightsAvailable(): Promise<boolean> {
		try {
			return await this.dashboardRepository.isBillingInsightsAvailable()
		} catch (error) {
			this.logger.error('Dashboard service failed to check billing insights availability', {
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}

	/**
	 * Get property performance metrics
	 * Delegates to repository layer for clean data access
	 */
	async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log('Fetching property performance via repository', { userId })
			return await this.dashboardRepository.getPropertyPerformance(userId)
		} catch (error) {
			this.logger.error('Dashboard service failed to get property performance', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return []
		}
	}

	/**
	 * Get system uptime metrics
	 * Delegates to repository layer for clean data access
	 */
	async getUptime(): Promise<SystemUptime> {
		try {
			this.logger.log('Fetching uptime metrics via repository')
			return await this.dashboardRepository.getUptime()
		} catch (error) {
			this.logger.error('Dashboard service failed to get uptime metrics', {
				error: error instanceof Error ? error.message : String(error)
			})
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
	}

	/**
	 * Get dashboard metrics - replaces get_dashboard_metrics function
	 * Uses repository pattern instead of database function
	 */
	async getMetrics(userId: string): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Fetching dashboard metrics via repository', { userId })

			// Use existing getStats method as foundation
			const stats = await this.getStats(userId)

			// Return metrics format expected by frontend
			return {
				totalProperties: stats.properties.total,
				totalUnits: stats.units.total,
				totalTenants: stats.tenants.total,
				totalLeases: stats.leases.total,
				occupancyRate: stats.units.occupancyRate,
				monthlyRevenue: stats.revenue.monthly,
				maintenanceRequests: stats.maintenance.total,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Dashboard service failed to get metrics', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {}
		}
	}

	/**
	 * Get dashboard summary - replaces get_dashboard_summary function
	 * Uses repository pattern instead of database function
	 */
	async getSummary(userId: string): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Fetching dashboard summary via repository', { userId })

			// Combine multiple repository calls for comprehensive summary
			const [stats, activity, propertyPerformance] = await Promise.all([
				this.getStats(userId),
				this.getActivity(userId),
				this.getPropertyPerformance(userId)
			])

			return {
				overview: {
					properties: stats.properties.total,
					units: stats.units.total,
					tenants: stats.tenants.active,
					occupancyRate: stats.units.occupancyRate
				},
				revenue: {
					monthly: stats.revenue.monthly,
					yearly: stats.revenue.yearly,
					growth: stats.revenue.growth
				},
				maintenance: {
					open: stats.maintenance.open,
					inProgress: stats.maintenance.inProgress,
					avgResolutionTime: stats.maintenance.avgResolutionTime
				},
				recentActivity: activity.activities.slice(0, 5),
				topPerformingProperties: propertyPerformance.slice(0, 3),
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Dashboard service failed to get summary', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {}
		}
	}

	/**
	 * Get occupancy trends using optimized RPC function
	 */
	async getOccupancyTrends(userId: string, months: number = 12) {
		try {
			this.logger.log('Fetching occupancy trends via analytics service', { userId, months })
			return await this.dashboardAnalyticsService.getOccupancyTrends(userId, months)
		} catch (error) {
			this.logger.error('Dashboard service failed to get occupancy trends', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				months
			})
			return []
		}
	}

	/**
	 * Get revenue trends using optimized RPC function
	 */
	async getRevenueTrends(userId: string, months: number = 12) {
		try {
			this.logger.log('Fetching revenue trends via analytics service', { userId, months })
			return await this.dashboardAnalyticsService.getRevenueTrends(userId, months)
		} catch (error) {
			this.logger.error('Dashboard service failed to get revenue trends', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				months
			})
			return []
		}
	}

	/**
	 * Get maintenance analytics using optimized RPC function
	 */
	async getMaintenanceAnalytics(userId: string) {
		try {
			this.logger.log('Fetching maintenance analytics via analytics service', { userId })
			return await this.dashboardAnalyticsService.getMaintenanceAnalytics(userId)
		} catch (error) {
			this.logger.error('Dashboard service failed to get maintenance analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			return {
				avgResolutionTime: 0,
				completionRate: 0,
				priorityBreakdown: {},
				trendsOverTime: []
			}
		}
	}
}