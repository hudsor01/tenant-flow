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
	averageRent: number
	rentChange: number
}

export interface TrendDataPoint {
	month: string
	[key: string]: string | number
}

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

export interface TenantMetrics {
	totalTenants: number
	newThisMonth: number
	endingThisMonth: number
	avgTenure: number
	onTimePaymentRate: number
	autopayAdoption: number
	satisfactionScore: number
}

export interface RevenueByUnitType {
	type: string
	units: number
	revenue: number
	percentage: number
}

export interface AnalyticsDashboardProps {
	overview: AnalyticsOverview
	occupancyTrend: OccupancyTrend[]
	revenueTrend: RevenueTrend[]
	propertyPerformance: PropertyPerformance[]
	maintenanceTrend: MaintenanceTrend[]
	maintenanceByCategory: MaintenanceCategory[]
	leaseExpiries: LeaseExpiry[]
	tenantMetrics: TenantMetrics
	revenueByUnitType: RevenueByUnitType[]
	onExport?: () => void
	onViewDetails?: (section: string) => void
}
