import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { LeasesService } from '../leases/leases.service'
import type { 
	DashboardStats,
	PropertyStats,
	TenantStats,
	UnitStats,
	LeaseStats
} from '@repo/shared'

// Using shared stats types - NO DUPLICATION
// Backend-specific raw types for service layer data mapping

type RawPropertyStats = { total?: number; vacantUnits?: number; totalMonthlyRent?: number }

type RawTenantStats = { total?: number; active?: number; inactive?: number }

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
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly tenantsService: TenantsService,
		private readonly leasesService: LeasesService,
		private readonly logger: PinoLogger
		// Removed errorHandler - using native NestJS patterns
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

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
const propertyData: RawPropertyStats = (rawPropertyStats ?? {}) as RawPropertyStats
const totalUnits = propertyData?.total ?? 0
const vacantUnits = propertyData?.vacantUnits ?? 0
const totalMonthlyRent = propertyData?.totalMonthlyRent ?? 0
const occupiedUnits = totalUnits - vacantUnits
const properties: PropertyStats = {
	total: totalUnits,
	owned: totalUnits,
	rented: occupiedUnits,
	available: vacantUnits,
	maintenance: 0 // TODO: Add maintenance calculation
}

			// Map to TenantStats interface
			const tenantData: RawTenantStats = (rawTenantStats ?? {}) as RawTenantStats
			const tenants: TenantStats = {
				total: tenantData?.total || 0,
				active: tenantData?.active || 0,
				inactive: tenantData?.inactive || 0
			}

			// Map to UnitStats interface
			const units: UnitStats = {
				totalUnits: totalUnits,
				availableUnits: vacantUnits,
				occupiedUnits: occupiedUnits,
				maintenanceUnits: 0, // TODO: Add maintenance units calculation
				averageRent: totalUnits > 0 ? totalMonthlyRent / totalUnits : 0,
				total: totalUnits,
				occupied: occupiedUnits,
				vacant: vacantUnits,
				occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
			}

			// Map to LeaseStats interface
			const leaseData = rawLeaseStats as unknown as LeaseStats
			const leases: LeaseStats = {
				totalLeases: leaseData?.totalLeases || 0,
				activeLeases: leaseData?.activeLeases || 0,
				expiredLeases: leaseData?.expiredLeases || 0,
				pendingLeases: leaseData?.pendingLeases || 0,
				totalRentRoll: totalMonthlyRent || 0,
				total: leaseData?.total || 0,
				active: leaseData?.active || 0,
				expired: leaseData?.expired || 0,
				pending: leaseData?.pending || 0
			}

			const dashboardStats: DashboardStats = {
				properties,
				tenants,
				units,
				leases,
				maintenance: {
					total: 0,
					open: 0,
					inProgress: 0,
					completed: 0
				},
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

			this.logger.info(
				{
					dashboard: {
						userId,
						hasAuthToken: !!authToken,
					stats: {
						totalProperties: dashboardStats.properties.total,
						totalTenants: dashboardStats.tenants.total,
						totalUnits: dashboardStats.units.total,
						totalLeases: dashboardStats.leases.total
					}
					}
				},
				`Dashboard stats retrieved for user ${userId}`
			)
			return dashboardStats
		} catch (error) {
			this.logger.error(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error),
						stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
					},
					dashboard: {
						userId,
						hasAuthToken: !!authToken
					}
				},
				'Failed to get dashboard stats'
			)

			throw new InternalServerErrorException(
				'Failed to retrieve dashboard statistics'
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

			this.logger.info(`Dashboard activity retrieved for user ${userId}`, {
				authToken
			})
			return activities
		} catch (error) {
			this.logger.error('Failed to get dashboard activity', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})

			throw new InternalServerErrorException(
				'Failed to retrieve dashboard activity'
			)
		}
	}
}
