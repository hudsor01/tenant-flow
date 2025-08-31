import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import type { 
	DashboardStats,
	PropertyStats,
	TenantStats,
	UnitStats,
	LeaseStats
} from '@repo/shared'

// RPC function return types - matches actual PostgreSQL functions
interface UnitStatsRPC {
	totalUnits: number
	occupiedUnits: number
	occupancyRate: number
}

interface InvoiceStatsRPC {
	totalAmount: number
	paidAmount: number
}

// Using shared stats types - NO DUPLICATION

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
		// @ts-expect-error Will be used when RPC functions are implemented
		private readonly _supabaseService: SupabaseService,
		private readonly logger: PinoLogger
		// Removed unused services and errorHandler - using native NestJS patterns
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Get comprehensive dashboard statistics - ALL CALCULATED IN DATABASE
	 * NO business logic here - just pass through from RPC
	 */
	async getStats(
		userId: string,
		authToken?: string
	): Promise<DashboardStats> {
		try {
			// TODO: Replace with single RPC call when migration 20250902_missing_rpc_functions.sql is applied
			// get_dashboard_metrics(p_user_id) will return ALL stats in one call
			const unitStats: UnitStatsRPC = {
				totalUnits: 0, // Will come from RPC: unit counts per user
				occupiedUnits: 0, // Will come from RPC: units with active leases
				occupancyRate: 0 // Will come from RPC: occupied/total percentage
			}
			const invoiceStats: InvoiceStatsRPC = {
				totalAmount: 0, // Will come from RPC: sum of all invoice amounts
				paidAmount: 0 // Will come from RPC: sum of paid invoices
			}

			// TODO: All stats will come from single RPC call - NO separate queries needed
			const properties: PropertyStats = {
				total: 0, // Will come from RPC: count of properties per user
				owned: 0, // Will come from RPC: properties owned by user
				rented: 0, // Will come from RPC: properties with active leases
				available: 0, // Will come from RPC: properties available for rent
				maintenance: 0 // Will come from RPC: properties with maintenance issues
			}

			const tenants: TenantStats = {
				total: 0, // Will come from RPC: count of tenants per user
				active: 0, // Will come from RPC: tenants with active leases
				inactive: 0 // Will come from RPC: tenants with expired/terminated leases
			}

			// Map to UnitStats interface - align with @repo/shared convention
			// TODO: Replace with actual RPC data when migration 20250902_missing_rpc_functions.sql is applied
			const units: UnitStats = {
				// Primary naming convention from @repo/shared
				total: unitStats.totalUnits || 0,
				occupied: unitStats.occupiedUnits || 0,
				vacant: 0, // totalUnits - occupiedUnits when RPC is available
				occupancyRate: unitStats.occupancyRate || 0,
				averageRent: 0, // Would need from unit stats RPC
				// Extended properties for compatibility
				totalUnits: unitStats.totalUnits || 0,
				availableUnits: 0, // Same as vacant when RPC is available
				occupiedUnits: unitStats.occupiedUnits || 0,
				maintenanceUnits: 0 // Would need from unit stats breakdown
			}

			// Map to LeaseStats interface - simplified for now
			const leases: LeaseStats = {
				totalLeases: 0,
				activeLeases: 0,
				expiredLeases: 0,
				pendingLeases: 0,
				totalRentRoll: invoiceStats.paidAmount || 0,
				total: 0,
				active: 0,
				expired: 0,
				pending: 0
			}

			// TODO: Will come from RPC - consolidated to eliminate DRY violation
			const maintenanceStats = {
				total: 0, // Will come from RPC: total maintenance requests
				open: 0, // Will come from RPC: open maintenance requests
				inProgress: 0, // Will come from RPC: in-progress requests
				completed: 0, // Will come from RPC: completed requests
				canceled: 0, // Will come from RPC: canceled requests
				onHold: 0, // Will come from RPC: on-hold requests
				overdue: 0, // Will come from RPC: overdue requests
				averageCompletionTime: 0, // Will come from RPC: avg completion time
				totalCost: 0, // Will come from RPC: total maintenance cost
				averageCost: 0 // Will come from RPC: average cost per request
			}

			const dashboardStats: DashboardStats = {
				properties,
				tenants,
				units,
				leases,
				maintenance: maintenanceStats,
				maintenanceRequests: maintenanceStats, // Reference same object - NO DUPLICATION
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
