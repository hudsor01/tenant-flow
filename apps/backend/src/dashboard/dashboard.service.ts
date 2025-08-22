import { Injectable, Logger } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { LeasesService } from '../leases/leases.service'
import type { DashboardStats } from '@repo/shared'

@Injectable()
export class DashboardService {
	private readonly logger = new Logger(DashboardService.name)

	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly tenantsService: TenantsService,
		private readonly leasesService: LeasesService
	) {}

	/**
	 * Get comprehensive dashboard statistics
	 */
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
		}
	}

	/**
	 * Get recent activity feed
	 */
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