// Dashboard Section Types

export interface DashboardProps {
	// Summary metrics
	metrics: DashboardMetrics

	// Revenue trend data
	revenueTrend: RevenueTrendPoint[]

	// Property performance
	propertyPerformance: PropertyPerformanceItem[]

	// Recent activity (optional for simplified dashboard)
	activities?: ActivityItem[]

	// Expiring leases (optional for simplified dashboard)
	expiringLeases?: ExpiringLeaseItem[]

	// Callbacks (optional)
	onViewProperty?: (propertyId: string) => void
	onViewLease?: (leaseId: string) => void
	onViewPayment?: (paymentId: string) => void
	onViewMaintenance?: (requestId: string) => void
	onExportAnalytics?: () => void
	onDateRangeChange?: (range: DateRange) => void
}

export interface DashboardMetrics {
	totalRevenue: number
	revenueChange: number // percentage change from previous period
	occupancyRate: number
	occupancyChange: number
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	activeLeases: number
	expiringLeases: number // expiring within 30 days
	openMaintenanceRequests: number
	collectionRate: number
}

export interface RevenueTrendPoint {
	month: string
	revenue: number
	projected?: number
}

export interface PropertyPerformanceItem {
	id: string
	name: string
	address: string
	totalUnits: number
	occupiedUnits: number
	occupancyRate: number
	monthlyRevenue: number
	openMaintenance: number
}

export interface ActivityItem {
	id: string
	type: 'payment' | 'maintenance' | 'lease' | 'tenant'
	title: string
	description: string
	timestamp: string
	entityId: string
	status?: 'success' | 'warning' | 'error' | 'info'
}

export interface ExpiringLeaseItem {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	endDate: string
	daysUntilExpiry: number
	rentAmount: number
}

export interface DateRange {
	start: string
	end: string
	preset?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
}
