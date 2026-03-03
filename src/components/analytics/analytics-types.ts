export interface OccupancyTrend {
	month: string
	rate: number
	occupied: number
	total: number
}

export interface RevenueTrend {
	month: string
	collected: number
	projected: number
}

export interface PropertyPerformance {
	id: string
	name: string
	occupancy: number
	revenue: number
	maintenance: number
	rating: number
}

export interface MaintenanceTrend {
	month: string
	opened: number
	completed: number
	avgDays: number
}

export interface MaintenanceCategory {
	category: string
	count: number
	percentage: number
	avgCost: number
}

export interface LeaseExpiry {
	month: string
	count: number
	value: number
}

export interface RevenueByUnitType {
	type: string
	units: number
	revenue: number
	percentage: number
}

export interface AnalyticsOverview {
	totalProperties: number
	totalUnits: number
	occupancyRate: number
	occupancyChange: number
	activeTenants: number
	tenantsChange: number
	monthlyRevenue: number
	revenueChange: number
	openMaintenance: number
	maintenanceChange: number
	leaseRenewalRate: number
	renewalChange: number
}

export function formatAnalyticsCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}
