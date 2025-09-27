/**
 * Analytics API Client
 * Consumes backend analytics controllers with RPC calculations
 * Replaces all frontend calculation logic
 */
import { serverFetch } from './server'

// Financial Analytics API
export const financialAnalytics = {
	/**
	 * Get revenue trends using PostgreSQL RPC calculations
	 * Replaces frontend calculations from revenue-trend-chart.tsx
	 */
	async getRevenueTrends(year?: number, timeRange = '12m') {
		const params = new URLSearchParams()
		if (year) params.set('year', year.toString())
		params.set('timeRange', timeRange)

		return serverFetch(`/financial/analytics/revenue-trends?${params}`)
	},

	/**
	 * Get dashboard financial metrics using PostgreSQL RPC calculations
	 * Replaces frontend calculations from financial.ts hooks
	 */
	async getDashboardMetrics() {
		return serverFetch('/financial/analytics/dashboard-metrics')
	},

	/**
	 * Get expense breakdown with percentages
	 * All calculations done server-side
	 */
	async getExpenseBreakdown(year?: number) {
		const params = new URLSearchParams()
		if (year) params.set('year', year.toString())

		return serverFetch(`/financial/analytics/expense-breakdown?${params}`)
	}
}

// Maintenance Analytics API
export const maintenanceAnalytics = {
	/**
	 * Get maintenance metrics with all calculations done server-side
	 * Replaces frontend calculations from maintenance-analytics.tsx lines 224-238, 266
	 */
	async getMetrics(propertyId?: string, timeframe = '30d', status?: string) {
		const params = new URLSearchParams()
		if (propertyId) params.set('propertyId', propertyId)
		params.set('timeframe', timeframe)
		if (status) params.set('status', status)

		return serverFetch(`/maintenance/analytics/metrics?${params}`)
	},

	/**
	 * Get maintenance cost summary with aggregations
	 */
	async getCostSummary(propertyId?: string, timeframe = '30d') {
		const params = new URLSearchParams()
		if (propertyId) params.set('propertyId', propertyId)
		params.set('timeframe', timeframe)

		return serverFetch(`/maintenance/analytics/cost-summary?${params}`)
	},

	/**
	 * Get maintenance performance analytics
	 */
	async getPerformance(propertyId?: string, period = 'monthly') {
		const params = new URLSearchParams()
		if (propertyId) params.set('propertyId', propertyId)
		params.set('period', period)

		return serverFetch(`/maintenance/analytics/performance?${params}`)
	}
}

// Visitor Analytics API
export const visitorAnalytics = {
	/**
	 * Get property interest analytics with all calculations done server-side
	 * Replaces frontend calculations from visitor-analytics-chart.tsx lines 103-145
	 */
	async getPropertyInterest(timeRange = '30d', propertyId?: string) {
		const params = new URLSearchParams()
		params.set('timeRange', timeRange)
		if (propertyId) params.set('propertyId', propertyId)

		return serverFetch(`/analytics/visitor/property-interest?${params}`)
	},

	/**
	 * Get inquiry conversion metrics
	 */
	async getInquiryMetrics(timeRange = '30d', propertyId?: string) {
		const params = new URLSearchParams()
		params.set('timeRange', timeRange)
		if (propertyId) params.set('propertyId', propertyId)

		return serverFetch(`/analytics/visitor/inquiry-metrics?${params}`)
	},

	/**
	 * Get viewing conversion metrics
	 */
	async getViewingMetrics(timeRange = '30d', propertyId?: string) {
		const params = new URLSearchParams()
		params.set('timeRange', timeRange)
		if (propertyId) params.set('propertyId', propertyId)

		return serverFetch(`/analytics/visitor/viewing-metrics?${params}`)
	},

	/**
	 * Get comparative analytics between time periods
	 */
	async getComparativeAnalytics(currentPeriod = '30d', previousPeriod = '30d') {
		const params = new URLSearchParams()
		params.set('currentPeriod', currentPeriod)
		params.set('previousPeriod', previousPeriod)

		return serverFetch(`/analytics/visitor/comparative?${params}`)
	}
}

// Combined analytics for convenience
export const analytics = {
	financial: financialAnalytics,
	maintenance: maintenanceAnalytics,
	visitor: visitorAnalytics
}