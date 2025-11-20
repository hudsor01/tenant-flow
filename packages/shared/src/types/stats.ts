/**
 * Statistics and Analytics Data Types
 * Consolidated source for all stats, metrics, and statistical aggregations
 */

// Base statistics interface
export interface BaseStats {
	total: number
}

// Property statistics
export interface PropertyStats extends BaseStats {
	occupied: number
	vacant: number
	occupancyRate: number
	totalMonthlyRent: number
	averageRent: number
}

// Tenant statistics
export interface TenantStats extends BaseStats {
	active: number
	inactive: number
	newThisMonth: number
	// Additional fields used by frontend
	totalTenants?: number
	activeTenants?: number
	currentPayments?: number
	latePayments?: number
	totalRent?: number
	avgRent?: number
	recentAdditions?: number
	withContactInfo?: number
}

// Tenant monetary summary exposed to frontend (amounts in cents)
export interface TenantSummary {
	total: number
	invited: number
	active: number
	overdueBalanceCents: number
	upcomingDueCents: number
	timestamp: string // ISO date
}

// Unit statistics
export interface UnitStats extends BaseStats {
	occupied: number
	vacant: number
	maintenance: number
	averageRent: number
	available: number
	occupancyRate: number
	occupancyChange: number // Period-over-period occupancy rate change percentage
	totalPotentialRent: number
	totalActualRent: number
}

// Unit statistics (alternative naming - for API responses)
export interface UnitStatistics {
	totalUnits: number
	availableUnits: number
	occupiedUnits: number
	maintenanceUnits: number
	averageRent: number
	// Additional properties needed by tests
	total: number
	occupied: number
	vacant: number
	occupancyRate: number
}

// Lease statistics
export interface LeaseStats extends BaseStats {
	active: number
	expired: number
	expiringSoon: number
	terminated?: number
	totalMonthlyRent?: number
	averageRent?: number
	totalsecurity_deposits?: number
	expiringLeases?: number
}

// Lease statistics (alternative naming - for API responses)
export interface LeaseStatistics {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	pendingLeases: number
	totalRentRoll: number
	// Additional properties needed by tests
	total: number
	active: number
}

// Maintenance statistics
export interface MaintenanceStats extends BaseStats {
	open: number
	inProgress: number
	completed: number
	completedToday: number
	avgResolutionTime: number
	byPriority: {
		low: number
		medium: number
		high: number
		emergency: number
	}
}

export interface MaintenanceAnalyticsData {
	categoryBreakdown?: Record<string, number>
	statusBreakdown?: Record<string, number>
	completionRate?: number
	avgResponseTime?: number
	avgSatisfaction?: number
	totalCost?: number
}

// Dashboard aggregated statistics (comprehensive version)
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
	// Backward compatibility fields (optional)
	totalProperties?: number
	totalUnits?: number
	totalTenants?: number
	totalRevenue?: number
	occupancyRate?: number
	maintenanceRequests?: number
}

// Financial overview and stats types
export interface DashboardFinancialStats {
	totalRevenue: number
	monthlyRecurring: number
	occupancyRate: number
	activeLeases: number
	totalUnits: number
	monthlyRevenueFormatted?: string
	revenueChange?: number
	monthlyExpensesFormatted?: string
	monthlyExpenses?: number
	expenseChange?: number
	netOperatingIncome?: number
	noiGrowth?: number
	profitMargin?: number
}

// Cache system types
export interface CacheEntry<T = unknown> {
	data: T
	version: number
	timestamp: number
	ttl: number
	dependencies: string[]
}

export interface CacheStats {
	hits: number
	misses: number
	invalidations: number
	entries: number
	memoryUsage: number
	hitRatio: number
}

// User statistics
export interface UserStats {
	totalUsers: number
	activeUsers: number
	newUsersThisMonth: number
	verifiedUsers: number
}
