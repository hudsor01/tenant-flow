import { Injectable, Logger } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { LeasesService } from '../leases/leases.service'
<<<<<<< HEAD
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
=======
import type { DashboardStats } from '@repo/shared'
>>>>>>> origin/copilot/vscode1755830877462

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly tenantsService: TenantsService,
<<<<<<< HEAD
		private readonly leasesService: LeasesService,
		private readonly errorHandler: ErrorHandlerService
=======
		private readonly leasesService: LeasesService
>>>>>>> origin/copilot/vscode1755830877462
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 */
<<<<<<< HEAD
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
=======
	async getStats(ownerId: string, authToken?: string): Promise<DashboardStats> {
		this.logger.log(`Getting dashboard stats for owner ${ownerId}`)

		try {
			// Get all data in parallel for better performance
			const [propertyStats, tenantStats, leaseStats] = await Promise.all([
				this.propertiesService.getStats(ownerId, authToken),
				this.tenantsService.getStats(ownerId),
				this.leasesService.getStats(ownerId)
			])

			// Calculate growth metrics (placeholder - real implementation would compare to previous period)
			const propertyGrowth = this.calculateGrowth(propertyStats.total, propertyStats.total * 0.9)
			const tenantGrowth = this.calculateGrowth(tenantStats.total, tenantStats.total * 0.95)
			const revenueGrowth = this.calculateGrowth(propertyStats.totalMonthlyRent, propertyStats.totalMonthlyRent * 0.88)

			const stats: DashboardStats = {
				properties: {
					total: propertyStats.total,
					growth: propertyGrowth,
					singleFamily: propertyStats.singleFamily,
					multiFamily: propertyStats.multiFamily,
					commercial: propertyStats.commercial
				},
				tenants: {
					total: tenantStats.total,
					growth: tenantGrowth,
					active: tenantStats.active,
					inactive: tenantStats.inactive
				},
				leases: {
					total: leaseStats.total,
					active: leaseStats.active,
					expiring: leaseStats.expired, // Using expired instead of expiring
					draft: leaseStats.draft
				},
				units: {
					total: propertyStats.totalUnits,
					occupied: propertyStats.occupiedUnits,
					vacant: propertyStats.vacantUnits,
					occupancyRate: propertyStats.totalUnits > 0 
						? Math.round((propertyStats.occupiedUnits / propertyStats.totalUnits) * 100)
						: 0
				},
				revenue: {
					total: propertyStats.totalMonthlyRent,
					growth: revenueGrowth,
					currency: 'USD'
				}
			}

			return stats
		} catch (error) {
			this.logger.error(`Failed to get dashboard stats: ${error}`)
			throw error
>>>>>>> origin/copilot/vscode1755830877462
		}
	}

	/**
	 * Get recent activity feed
	 */
<<<<<<< HEAD
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
=======
	async getActivity(ownerId: string, _authToken?: string): Promise<{
		activities: {
			id: string
			type: 'property' | 'tenant' | 'lease' | 'maintenance'
			action: 'created' | 'updated' | 'deleted'
			title: string
			description: string
			timestamp: string
			userId: string
		}[]
	}> {
		this.logger.log(`Getting dashboard activity for owner ${ownerId}`)

		try {
			// For now, return a placeholder activity feed
			// In a real implementation, this would query an activity log table
			const activities = [
				{
					id: '1',
					type: 'property' as const,
					action: 'created' as const,
					title: 'New Property Added',
					description: 'Sunset Apartments was successfully added to your portfolio',
					timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
					userId: ownerId
				},
				{
					id: '2',
					type: 'tenant' as const,
					action: 'updated' as const,
					title: 'Tenant Information Updated',
					description: 'Contact information updated for John Doe',
					timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
					userId: ownerId
				},
				{
					id: '3',
					type: 'lease' as const,
					action: 'created' as const,
					title: 'New Lease Signed',
					description: 'Lease agreement signed for Unit 2B',
					timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
					userId: ownerId
				}
			]

			return { activities }
		} catch (error) {
			this.logger.error(`Failed to get dashboard activity: ${error}`)
			throw error
		}
	}

	/**
	 * Calculate growth percentage between current and previous values
	 */
	private calculateGrowth(current: number, previous: number): number {
		if (previous === 0) {return current > 0 ? 100 : 0}
		return Math.round(((current - previous) / previous) * 100)
	}
}
>>>>>>> origin/copilot/vscode1755830877462
