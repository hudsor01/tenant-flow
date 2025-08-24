/**
 * Shared statistics types for all entities
 * Single source of truth for stats interfaces
 */

/**
 * Base stats interface that all entity stats extend from
 */
export interface BaseStats {
	total: number
}

/**
 * Property statistics
 */
export interface PropertyStats extends BaseStats {
	occupied: number
	vacant: number
	occupancyRate: number
	totalMonthlyRent: number
	averageRent: number
}

/**
 * Tenant statistics
 */
export interface TenantStats extends BaseStats {
	active: number
	inactive: number
	newThisMonth: number
}

/**
 * Unit statistics
 */
export interface UnitStats extends BaseStats {
	occupied: number
	vacant: number
	maintenance: number
	averageRent: number
	available: number
	occupancyRate: number
	totalPotentialRent: number
	totalActualRent: number
}

/**
 * Lease statistics
 */
export interface LeaseStats extends BaseStats {
	active: number
	expired: number
	expiringSoon: number
}

/**
 * Maintenance statistics
 */
export interface MaintenanceStats extends BaseStats {
	open: number
	inProgress: number
	completed: number
	avgResolutionTime: number
	byPriority: {
		low: number
		medium: number
		high: number
		emergency: number
	}
}

/**
 * Dashboard aggregated statistics
 */
export interface DashboardStats {
	properties: PropertyStats
	tenants: TenantStats
	units: UnitStats
	leases: LeaseStats
	maintenance: MaintenanceStats
	revenue: {
		monthly: number
		yearly: number
		growth: number
	}
}