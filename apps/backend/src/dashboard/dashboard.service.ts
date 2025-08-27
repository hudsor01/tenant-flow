import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
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
/** Add safe raw types for backend service-to-shared shape differences */
// Removed ErrorHandlerService - using native NestJS exceptions

type RawPropertyStats = Partial<PropertyStats & { vacantUnits?: number; totalMonthlyRent?: number; total?: number }>

type RawTenantStats = Partial<TenantStats & { pendingInvitations?: number; total?: number }>

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

/* Map to PropertyStats interface with frontend-dependent properties restored */
const propertyData: RawPropertyStats = (rawPropertyStats ?? {}) as RawPropertyStats
const totalUnits = propertyData?.totalUnits ?? 0
const occupiedUnits = propertyData?.occupiedUnits ?? 0
const availableUnits = propertyData?.availableUnits ?? propertyData?.vacantUnits ?? 0
const totalMonthlyRent = propertyData?.totalMonthlyRent ?? 0
const properties: PropertyStats = {
totalProperties: propertyData?.totalProperties ?? 0,
activeProperties: propertyData?.activeProperties ?? 0,
totalUnits,
occupiedUnits,
availableUnits,
occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
}

			// Map to TenantStats interface
			const tenantData: RawTenantStats = (rawTenantStats ?? {}) as RawTenantStats
			const tenants: TenantStats = {
				totalTenants: tenantData?.totalTenants || 0,
				activeTenants: tenantData?.activeTenants || 0,
				inactiveTenants: tenantData?.inactiveTenants || 0,
				newTenants: tenantData?.newTenants ?? 0
											}

			// Map to UnitStats interface
			const units: UnitStats = {
				totalUnits: propertyData?.totalUnits || 0,
				availableUnits: propertyData?.vacantUnits || 0,
				occupiedUnits: propertyData?.occupiedUnits || 0,
				maintenanceUnits: 0, // TODO: Add maintenance units calculation
averageRent:
 totalUnits > 0
 ? totalMonthlyRent / totalUnits
 : 0,
				total: propertyData?.totalUnits || 0,
				occupied: propertyData?.occupiedUnits || 0,
				vacant: propertyData?.vacantUnits || 0,
occupancyRate:
 totalUnits > 0
 ? Math.round((occupiedUnits / totalUnits) * 100)
 : 0
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
				active: leaseData?.active || 0
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

			this.logger.info(
				{
					dashboard: {
						userId,
						hasAuthToken: !!authToken,
stats: {
totalProperties: dashboardStats.properties.totalProperties,
totalTenants: dashboardStats.tenants.totalTenants,
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
