/**
 * EMPTY STATE CONSTANTS
 *
 * Reusable empty state objects for consistent fallback values across the application.
 * Single source of truth for zero-state returns.
 */

import type {
	DashboardStats,
	MaintenanceStats,
	PropertyStats,
	SystemUptime,
	TenantStats,
	UnitStats,
	LeaseStats
} from '../types/core.js'

/** Empty property statistics */
export const EMPTY_PROPERTY_STATS: PropertyStats = {
	total: 0,
	occupied: 0,
	vacant: 0,
	occupancyRate: 0,
	totalMonthlyRent: 0,
	averageRent: 0
}

/** Empty tenant statistics */
export const EMPTY_TENANT_STATS: TenantStats = {
	total: 0,
	active: 0,
	inactive: 0,
	newThisMonth: 0
}

/** Empty unit statistics */
export const EMPTY_UNIT_STATS: UnitStats = {
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
}

/** Empty lease statistics */
export const EMPTY_LEASE_STATS: LeaseStats = {
	total: 0,
	active: 0,
	expired: 0,
	expiringSoon: 0
}

/** Empty maintenance statistics */
export const EMPTY_MAINTENANCE_STATS: MaintenanceStats = {
	total: 0,
	open: 0,
	inProgress: 0,
	completed: 0,
	completedToday: 0,
	avgResolutionTime: 0,
	byPriority: {
		low: 0,
		medium: 0,
		high: 0,
		emergency: 0
	}
}

/** Empty dashboard statistics (aggregated) */
export const EMPTY_DASHBOARD_STATS: DashboardStats = {
	properties: EMPTY_PROPERTY_STATS,
	tenants: EMPTY_TENANT_STATS,
	units: EMPTY_UNIT_STATS,
	leases: EMPTY_LEASE_STATS,
	maintenance: EMPTY_MAINTENANCE_STATS,
	revenue: {
		monthly: 0,
		yearly: 0,
		growth: 0
	},
	totalProperties: 0,
	totalUnits: 0,
	totalTenants: 0,
	totalRevenue: 0,
	occupancyRate: 0,
	maintenanceRequests: 0
}

/** Empty system uptime metrics */
export const EMPTY_SYSTEM_UPTIME: SystemUptime = {
	uptime: '99.9%',
	uptimePercentage: 99.9,
	sla: '99.5%',
	slaStatus: 'excellent',
	status: 'operational',
	lastIncident: null,
	responseTime: 150,
	timestamp: new Date().toISOString()
}

/** Empty maintenance analytics */
export const EMPTY_MAINTENANCE_ANALYTICS = {
	avgResolutionTime: 0,
	completionRate: 0,
	priorityBreakdown: {},
	trendsOverTime: []
}
