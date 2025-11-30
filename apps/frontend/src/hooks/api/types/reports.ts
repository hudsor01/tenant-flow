/**
 * Report types
 * Shared types for reports functionality
 */

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