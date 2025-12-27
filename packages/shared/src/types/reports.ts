export interface Report {
	id: string
	user_id: string
	reportType: string
	reportName: string
	format: string
	status: string
	fileUrl: string | null
	filePath: string | null
	fileSize: number | null
	start_date: string
	end_date: string
	metadata: Record<string, unknown>
	errorMessage: string | null
	created_at: string
	updated_at: string
}

export interface ListReportsResponse {
	success: boolean
	data: Report[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}

export interface RevenueData {
	month: string
	revenue: number
	expenses: number
	profit: number
	propertyCount: number
	unitCount: number
	occupiedUnits: number
}

export interface PaymentAnalytics {
	totalPayments: number
	successfulPayments: number
	failedPayments: number
	totalRevenue: number
	averagePayment: number
	paymentsByMethod: {
		card: number
		ach: number
	}
	paymentsByStatus: {
		completed: number
		pending: number
		failed: number
	}
}

export interface OccupancyMetrics {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	byProperty: Array<{
		property_id: string
		propertyName: string
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
	}>
}


export interface FinancialReport {
	summary: {
		totalIncome: number
		totalExpenses: number
		netIncome: number
		cashFlow: number
		rentRollOccupancyRate: number
	}
	monthly: Array<{
		month: string
		income: number
		expenses: number
		net: number
	}>
	expenseBreakdown: Array<{
		category: string
		amount: number
	}>
	rentRoll: Array<{
		propertyId: string
		propertyName: string
		unitCount: number
		occupiedUnits: number
		occupancyRate: number
		rentPotential: number
	}>
}

export interface PropertyReport {
	summary: {
		totalProperties: number
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
	}
	byProperty: Array<{
		propertyId: string
		propertyName: string
		occupancyRate: number
		vacantUnits: number
		revenue: number
		expenses: number
		netOperatingIncome: number
	}>
	occupancyTrend: Array<{
		month: string
		occupancyRate: number
	}>
	vacancyTrend: Array<{
		month: string
		vacantUnits: number
	}>
}

export interface TenantReport {
	summary: {
		totalTenants: number
		activeLeases: number
		leasesExpiringNext90: number
		turnoverRate: number
		onTimePaymentRate: number
	}
	paymentHistory: Array<{
		month: string
		paymentsReceived: number
		onTimeRate: number
	}>
	leaseExpirations: Array<{
		leaseId: string
		propertyName: string
		unitLabel: string
		endDate: string
	}>
	turnover: Array<{
		month: string
		moveIns: number
		moveOuts: number
	}>
}

export interface MaintenanceReport {
	summary: {
		totalRequests: number
		openRequests: number
		avgResolutionHours: number
		totalCost: number
		averageCost: number
	}
	byStatus: Array<{
		status: string
		count: number
	}>
	byPriority: Array<{
		priority: string
		count: number
	}>
	monthlyCost: Array<{
		month: string
		cost: number
	}>
	vendorPerformance: Array<{
		vendorName: string
		totalSpend: number
		jobs: number
	}>
}
