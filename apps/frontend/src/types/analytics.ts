// Analytics-related types

export interface AnalyticsEventData {
	[key: string]: string | number | boolean | null
}
export interface PropertyMetric {
	propertyId: string
	propertyName: string
	propertyAddress: string
	totalUnits: number
	occupiedUnits: number
	occupancyRate: number
	avgRentPerUnit: number
	totalMonthlyRevenue: number
	potentialRevenue: number
	revenueEfficiency: number
	avgTenancyLength: number
	turnoverRate: number
	maintenanceRequestsCount: number
	avgMaintenanceResponseTime: number
	maintenanceCostPerUnit: number
	tenantSatisfactionScore: number
	profitMargin: number
	totalExpenses: number
	netOperatingIncome: number
	capRate: number
	lastUpdated: string
}

export interface PropertyTrend {
	propertyId: string
	date: string
	occupancyRate: number
	revenue: number
	expenses: number
	netIncome: number
	maintenanceRequests: number
}

export interface PropertyAlert {
	id: string
	propertyId: string
	type:
		| 'occupancy_drop'
		| 'maintenance_spike'
		| 'revenue_decline'
		| 'expense_increase'
		| 'lease_expiring'
	severity: 'low' | 'medium' | 'high' | 'critical'
	title: string
	message: string
	timestamp: string
	read: boolean
	actionUrl?: string
	data?: Record<string, unknown>
}

export interface AnalyticsSettings {
	enableAutomatedReports: boolean
	reportFrequency: 'daily' | 'weekly' | 'MONTHLY'
	alertThresholds: {
		occupancyDropPercent: number
		maintenanceSpike: number
		revenueDecline: number
		expenseIncrease: number
	}
	benchmarkComparisons: boolean
	includeMarketData: boolean
}

export interface MaintenanceRequestAnalytics {
	id: string
	createdAt: string
	resolvedAt?: string
}

export interface PropertyWithAnalytics {
	id: string
	name: string
	address?: string
	units: {
		id: string
		unitNumber: string
		rent?: number
	}[]
	leases: {
		id: string
		status: string
		rentAmount?: number
		startDate?: string | Date
		endDate?: string | Date
	}[]
}

export interface TopPayingTenant {
	tenantId: string
	tenantName: string
	totalAmount: number
	paymentCount: number
}
