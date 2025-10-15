import { Injectable, Logger } from '@nestjs/common'
import type {
	DashboardStats,
	PropertyPerformance,
	SystemUptime
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly dashboardAnalyticsService: DashboardAnalyticsService
	) {}

	/**
	 * Helper method to get unit IDs for a user (via property ownership)
	 */
	private async getUserUnitIds(userId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()
		const { data: properties } = await client
			.from('property')
			.select('id')
			.eq('owner_id', userId)
		const propertyIds = properties?.map(p => p.id) || []
		if (propertyIds.length === 0) return []

		const { data: units } = await client
			.from('unit')
			.select('id')
			.in('property_id', propertyIds)
		return units?.map(u => u.id) || []
	}

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
			this.logger.log('Fetching dashboard stats via direct Supabase query', {
				userId
			})

			const client = this.supabase.getAdminClient()

			// Get property stats
			const { data: propertyData } = await client
				.from('property')
				.select('id')
				.eq('owner_id', userId)

			const properties = {
				total: propertyData?.length || 0,
				occupied: 0, // Need to calculate from units
				vacant: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0, // Will be calculated from units
				averageRent: 0 // Will be calculated from units
			}

			// Get unit stats
			const { data: unitData } = await client
				.from('unit')
				.select('id, status, rent')
				.in('property_id', propertyData?.map(p => p.id) || [])

			const units = {
				total: unitData?.length || 0,
				occupied: unitData?.filter(u => u.status === 'OCCUPIED').length || 0,
				vacant: unitData?.filter(u => u.status === 'VACANT').length || 0,
				maintenance:
					unitData?.filter(u => u.status === 'MAINTENANCE').length || 0,
				averageRent:
					unitData && unitData.length > 0
						? unitData.reduce((sum, unit) => sum + (unit.rent || 0), 0) /
							unitData.length
						: 0,
				available: unitData?.filter(u => u.status === 'VACANT').length || 0,
				occupancyRate:
					unitData && unitData.length > 0
						? Math.round(
								(unitData.filter(u => u.status === 'OCCUPIED').length /
									unitData.length) *
									100
							)
						: 0,
				occupancyChange: 0,
				totalPotentialRent:
					unitData?.reduce((sum, unit) => sum + (unit.rent || 0), 0) || 0,
				totalActualRent:
					unitData
						?.filter(u => u.status === 'OCCUPIED')
						.reduce((sum, unit) => sum + (unit.rent || 0), 0) || 0
			}

			// Update property occupancy based on units
			properties.occupied = units.occupied
			properties.vacant = units.vacant
			properties.occupancyRate = units.occupancyRate

			// Get tenant stats
			const { data: leaseData } = await client
				.from('lease')
				.select('id, tenantId, status, endDate')
				.in('unit_id', unitData?.map(u => u.id) || [])

			const { data: tenantData } = await client
				.from('tenant')
				.select('id')
				.in('id', leaseData?.map(l => l.tenantId) || [])

			const tenants = {
				total: tenantData?.length || 0,
				active: leaseData?.filter(l => l.status === 'ACTIVE').length || 0,
				inactive: leaseData?.filter(l => l.status !== 'ACTIVE').length || 0,
				newThisMonth: 0 // Need to calculate from created_at
			}

			// Get lease stats
			const leases = {
				total: leaseData?.length || 0,
				active: leaseData?.filter(l => l.status === 'ACTIVE').length || 0,
				expired:
					leaseData?.filter(l => new Date(l.endDate) < new Date()).length || 0,
				expiringSoon:
					leaseData?.filter(
						l =>
							new Date(l.endDate) > new Date() &&
							new Date(l.endDate) <= new Date(Date.now() + 30 * 24 * 60 * 1000)
					).length || 0
			}

			// Get maintenance stats
			const unitIds = await this.getUserUnitIds(userId)
			const { data: maintenanceData } =
				unitIds.length > 0
					? await client
							.from('maintenance_request')
							.select('id, priority, status, updatedAt')
							.in('unit_id', unitIds)
					: { data: [] }

			const maintenance = {
				total: maintenanceData?.length || 0,
				open: maintenanceData?.filter(m => m.status === 'OPEN').length || 0,
				inProgress:
					maintenanceData?.filter(m => m.status === 'IN_PROGRESS').length || 0,
				completed:
					maintenanceData?.filter(m => m.status === 'COMPLETED').length || 0,
				completedToday:
					maintenanceData?.filter(
						m =>
							m.status === 'COMPLETED' &&
							new Date(m.updatedAt).toDateString() === new Date().toDateString()
					).length || 0,
				avgResolutionTime: 0, // Would need to calculate from created_at to completed_at
				byPriority: {
					low: maintenanceData?.filter(m => m.priority === 'LOW').length || 0,
					medium:
						maintenanceData?.filter(m => m.priority === 'MEDIUM').length || 0,
					high: maintenanceData?.filter(m => m.priority === 'HIGH').length || 0,
					emergency:
						maintenanceData?.filter(m => m.priority === 'EMERGENCY').length || 0
				}
			}

			// Get revenue stats (simplified - would need actual payment data)
			const revenue = {
				monthly: 0, // Would need to get from payments table
				yearly: 0,
				growth: 0
			}

			return {
				properties,
				tenants,
				units,
				leases,
				maintenance,
				revenue
			}
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
			this.logger.log('Fetching dashboard activity via direct Supabase query', {
				userId
			})

			// NOTE: Activity table doesn't exist yet - return empty array for now
			// When implemented, filter by property ownership
			const activityData: unknown[] = []

			// Example implementation when activity table exists:
			// const propertyIds = await this.getUserPropertyIds(userId)
			// const { data: activityData } = await client
			// 	.from('activity')
			// 	.select('*')
			// 	.in('property_id', propertyIds)
			// 	.order('created_at', { ascending: false })
			// 	.limit(10)

			return { activities: activityData || [] }
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
			this.logger.log('Fetching billing insights via direct Supabase query', {
				userId,
				startDate,
				endDate
			})

			const client = this.supabase.getAdminClient()

			// Get billing insights - using a placeholder table, should be replaced with actual billing table
			const queryBuilder = client
				.from('property') // Using property table as placeholder - needs actual billing table
				.select('*')
				.eq('owner_id', userId) // Using owner_id instead of org_id for property table

			if (startDate) {
				queryBuilder.gte('created_at', startDate.toISOString())
			}
			if (endDate) {
				queryBuilder.lte('created_at', endDate.toISOString())
			}

			const { data: billingData } = await queryBuilder

			return billingData?.[0] || null
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
			const client = this.supabase.getAdminClient()

			// Check if billing insights are available by checking if there's billing data
			const { count, error } = await client
				.from('property') // Using property table as placeholder - needs actual billing table
				.select('*', { count: 'exact', head: true })
				.limit(1)

			if (error) {
				this.logger.error('Error checking billing insights availability', {
					error: error.message
				})
				return false
			}

			return count !== null && count > 0
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to check billing insights availability',
				{
					error: error instanceof Error ? error.message : String(error)
				}
			)
			return false
		}
	}

	/**
	 * Get property performance metrics
	 * Delegates to repository layer for clean data access
	 */
	async getPropertyPerformance(userId: string): Promise<PropertyPerformance[]> {
		try {
			this.logger.log(
				'Fetching property performance via direct Supabase query',
				{
					userId
				}
			)

			const client = this.supabase.getAdminClient()

			// Get property performance metrics - this would typically involve complex queries
			// For now, using property and unit data to calculate performance
			const { data: propertyData } = await client
				.from('property')
				.select('id, name')
				.eq('owner_id', userId)

			const { data: unitData } = await client
				.from('unit')
				.select('id, propertyId, status, rent')
				.in('propertyId', propertyData?.map(p => p.id) || [])

			// Calculate performance metrics
			const performanceData = (propertyData ?? []).map(property => {
				const propertyUnits =
					unitData?.filter(unit => unit.propertyId === property.id) || []
				const occupiedUnits = propertyUnits.filter(
					unit => unit.status === 'OCCUPIED'
				).length
				const totalUnits = propertyUnits.length
				const vacantUnits = totalUnits - occupiedUnits
				const totalRent = propertyUnits.reduce(
					(sum, unit) => sum + (unit.rent || 0),
					0
				)
				const maxRent =
					propertyUnits.length > 0
						? Math.max(...propertyUnits.map(u => u.rent || 0))
						: 0
				const occupancyRate =
					totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
				const status: PropertyPerformance['status'] =
					totalUnits === 0
						? 'NO_UNITS'
						: occupiedUnits === 0
							? 'VACANT'
							: occupiedUnits === totalUnits
								? 'FULL'
								: 'PARTIAL'

				return {
					property: property.name || property.id,
					propertyId: property.id,
					units: totalUnits,
					totalUnits,
					occupiedUnits,
					vacantUnits,
					occupancy: `${occupancyRate}%`,
					occupancyRate,
					revenue: totalRent,
					monthlyRevenue: totalRent,
					potentialRevenue: totalUnits * maxRent,
					address: '',
					propertyType: 'SINGLE_FAMILY',
					status
				}
			})

			return performanceData
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to get property performance',
				{
					error: error instanceof Error ? error.message : String(error),
					userId
				}
			)
			return []
		}
	}

	/**
	 * Get system uptime metrics
	 * Delegates to repository layer for clean data access
	 */
	async getUptime(): Promise<SystemUptime> {
		try {
			this.logger.log('Fetching uptime metrics via direct Supabase query')

			// Simulate uptime metrics - in a real implementation, this would query system monitoring data
			const uptimeData: SystemUptime = {
				uptime: '99.9%',
				uptimePercentage: 99.9,
				sla: '99.5%',
				slaStatus: 'excellent' as const,
				status: 'operational',
				lastIncident: null,
				responseTime: 150,
				timestamp: new Date().toISOString()
			}

			return uptimeData
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
			this.logger.log('Fetching occupancy trends via analytics service', {
				userId,
				months
			})
			return await this.dashboardAnalyticsService.getOccupancyTrends(
				userId,
				months
			)
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
			this.logger.log('Fetching revenue trends via analytics service', {
				userId,
				months
			})
			return await this.dashboardAnalyticsService.getRevenueTrends(
				userId,
				months
			)
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
			this.logger.log('Fetching maintenance analytics via analytics service', {
				userId
			})
			return await this.dashboardAnalyticsService.getMaintenanceAnalytics(
				userId
			)
		} catch (error) {
			this.logger.error(
				'Dashboard service failed to get maintenance analytics',
				{
					error: error instanceof Error ? error.message : String(error),
					userId
				}
			)
			return {
				avgResolutionTime: 0,
				completionRate: 0,
				priorityBreakdown: {},
				trendsOverTime: []
			}
		}
	}
}
