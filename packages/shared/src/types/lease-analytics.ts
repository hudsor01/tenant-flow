import type {
	LeaseFinancialInsight,
	LeaseFinancialSummary
} from './financial-analytics.js'

export interface LeaseLifecyclePoint {
	period: string
	renewals: number
	expirations: number
	noticesGiven: number
}

export interface LeaseStatusBreakdown {
	status: string
	count: number
	percentage: number
}

export interface LeaseAnalyticsPageResponse {
	metrics: LeaseFinancialSummary
	profitability: LeaseFinancialInsight[]
	lifecycle: LeaseLifecyclePoint[]
	statusBreakdown: LeaseStatusBreakdown[]
}
