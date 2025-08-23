import { Injectable, Logger } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { LeasesService } from '../leases/leases.service'
import type {
	DashboardStats,
	LeaseStats,
	UnitStats
} from '@repo/shared/types/api'
import type { PropertyStats } from '@repo/shared/types/properties'
import type { TenantStats } from '@repo/shared/types/tenants'
import {
	ErrorCode,
	ErrorHandlerService
} from '../services/error-handler.service'

export interface DashboardActivity {
	activities: {
		id: string
		type: 'property' | 'tenant' | 'lease' | 'maintenance'
		action: 'created' | 'updated' | 'deleted'
		title: string
		description: string
		timestamp: string
		userId: string
	}[]
}

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly tenantsService: TenantsService,
		private readonly leasesService: LeasesService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 */
	async getStats(
		userId: string,
		authToken?: string
	): Promise<DashboardStats> {
		try {
			// Get stats from all services in parallel
			const [rawPropertyStats, rawTenantStats, rawLeaseStats] =
				await Promise.all([
					this.propertiesService.getStats(userId),
					this.tenantsService.getStats(userId),
					this.leasesService.getStats(userId)
				])

			// Map to PropertyStats interface
			const properties: PropertyStats = {
				totalUnits: rawPropertyStats.totalUnits || 0,
				occupiedUnits: rawPropertyStats.occupiedUnits || 0,
				vacantUnits: rawPropertyStats.vacantUnits || 0,
				occupancyRate:
					rawPropertyStats.totalUnits > 0
						? Math.round(
								(rawPropertyStats.occupiedUnits /
									rawPropertyStats.totalUnits) *
									100
							)
						: 0,
				totalMonthlyRent: rawPropertyStats.totalMonthlyRent || 0,
				potentialRent: rawPropertyStats.totalMonthlyRent || 0, // TODO: Calculate actual potential rent
				totalProperties: rawPropertyStats.total || 0,
				totalRent: rawPropertyStats.totalMonthlyRent || 0,
				collectedRent: rawPropertyStats.totalMonthlyRent || 0, // TODO: Calculate actual collected rent
				pendingRent: 0, // TODO: Calculate pending rent
				total: rawPropertyStats.total || 0,
				singleFamily: 0, // TODO: Calculate from property types
				multiFamily: 0, // TODO: Calculate from property types
				commercial: 0 // TODO: Calculate from property types
			}

			// Map to TenantStats interface
			const tenants: TenantStats = {
				totalTenants: rawTenantStats.total || 0,
				activeTenants: rawTenantStats.active || 0,
				inactiveTenants: rawTenantStats.inactive || 0,
				pendingInvitations: 0, // TODO: Add actual pending invitations count
				total: rawTenantStats.total || 0
			}

			// Map to UnitStats interface
			const units: UnitStats = {
				totalUnits: rawPropertyStats.totalUnits || 0,
				availableUnits: rawPropertyStats.vacantUnits || 0,
				occupiedUnits: rawPropertyStats.occupiedUnits || 0,
				maintenanceUnits: 0, // TODO: Add maintenance units calculation
				averageRent:
					rawPropertyStats.totalUnits > 0
						? rawPropertyStats.totalMonthlyRent /
							rawPropertyStats.totalUnits
						: 0,
				total: rawPropertyStats.totalUnits || 0,
				occupied: rawPropertyStats.occupiedUnits || 0,
				vacant: rawPropertyStats.vacantUnits || 0,
				occupancyRate:
					rawPropertyStats.totalUnits > 0
						? Math.round(
								(rawPropertyStats.occupiedUnits /
									rawPropertyStats.totalUnits) *
									100
							)
						: 0
			}

			// Map to LeaseStats interface
			const leases: LeaseStats = {
				totalLeases: rawLeaseStats.total || 0,
				activeLeases: rawLeaseStats.active || 0,
				expiredLeases: rawLeaseStats.expired || 0,
				pendingLeases: rawLeaseStats.draft || 0,
				totalRentRoll: rawPropertyStats.totalMonthlyRent || 0,
				total: rawLeaseStats.total || 0,
				active: rawLeaseStats.active || 0
			}

			const dashboardStats: DashboardStats = {
				properties,
				tenants,
				units,
				leases,
				maintenanceRequests: {
					total: 0,
					open: 0,
					inProgress: 0,
					completed: 0
				},
				notifications: {
					total: 0,
					unread: 0
				},
				revenue: {
					total: 0,
					monthly: 0,
					collected: 0
				}
			}

			this.logger.log(`Dashboard stats retrieved for user ${userId}`, {
				authToken
			})
			return dashboardStats
		} catch (error) {
			this.logger.error('Failed to get dashboard stats', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})

			throw this.errorHandler.createBusinessError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Failed to retrieve dashboard statistics',
				{
					operation: 'getStats',
					resource: 'dashboard',
					metadata: { userId }
				}
			)
		}
	}

	/**
	 * Get recent activity feed
	 */
	async getActivity(
		userId: string,
		authToken?: string
	): Promise<DashboardActivity> {
		try {
			// TODO: Implement actual activity feed from database
			// For now, return empty activity feed
			const activities: DashboardActivity = {
				activities: []
			}

			this.logger.log(`Dashboard activity retrieved for user ${userId}`, {
				authToken
			})
			return activities
		} catch (error) {
			this.logger.error('Failed to get dashboard activity', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})

			throw this.errorHandler.createBusinessError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Failed to retrieve dashboard activity',
				{
					operation: 'getActivity',
					resource: 'dashboard',
					metadata: { userId }
				}
			)
		}
	}
}