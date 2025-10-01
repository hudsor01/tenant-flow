import { cache } from 'react'

import type {
	FinancialAnalyticsPageResponse,
	FinancialMetricSummary,
	FinancialOverviewSnapshot,
	LeaseFinancialInsight,
	LeaseFinancialSummary,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	RevenueExpenseBreakdown
} from '@repo/shared/types/financial-analytics'
import type { LeaseAnalyticsPageResponse } from '@repo/shared/types/lease-analytics'
import type { MaintenanceAnalyticsPageResponse } from '@repo/shared/types/maintenance-analytics'
import type { OccupancyAnalyticsPageResponse } from '@repo/shared/types/occupancy-analytics'
import type { PropertyPerformancePageResponse } from '@repo/shared/types/property-analytics'

import { serverFetch } from '@/lib/api/server'

const ENDPOINT_BASE = '/api/v1/analytics'

export const getFinancialMetrics = cache(async () => {
	return serverFetch<FinancialMetricSummary>(
		`${ENDPOINT_BASE}/financial-metrics`
	)
})

export const getFinancialBreakdown = cache(async () => {
	return serverFetch<RevenueExpenseBreakdown>(
		`${ENDPOINT_BASE}/financial-breakdown`
	)
})

export const getNetOperatingIncome = cache(async () => {
	return serverFetch<NetOperatingIncomeByProperty[]>(
		`${ENDPOINT_BASE}/net-operating-income`
	)
})

export const getFinancialOverview = cache(async () => {
	return serverFetch<FinancialOverviewSnapshot>(
		`${ENDPOINT_BASE}/financial-overview`
	)
})

export const getBillingInsights = cache(async () => {
	return serverFetch(`${ENDPOINT_BASE}/billing-insights`)
})

export const getExpenseSummary = cache(async () => {
	return serverFetch(`${ENDPOINT_BASE}/expense-summary`)
})

export const getInvoiceStatistics = cache(async () => {
	return serverFetch(`${ENDPOINT_BASE}/invoice-statistics`)
})

export const getMonthlyFinancialMetrics = cache(async () => {
	return serverFetch<MonthlyFinancialMetric[]>(
		`${ENDPOINT_BASE}/monthly-metrics`
	)
})

export const getLeaseFinancialSummary = cache(async () => {
	return serverFetch<LeaseFinancialSummary>(
		`${ENDPOINT_BASE}/lease-financial-summary`
	)
})

export const getLeaseFinancialAnalytics = cache(async () => {
	return serverFetch<LeaseFinancialInsight[]>(
		`${ENDPOINT_BASE}/lease-financial-analytics`
	)
})

export const getFinancialAnalyticsPageData = cache(async () => {
	return serverFetch<FinancialAnalyticsPageResponse>(
		`${ENDPOINT_BASE}/financial/page-data`
	)
})

export const getPropertyPerformancePageData = cache(async () => {
	return serverFetch<PropertyPerformancePageResponse>(
		`${ENDPOINT_BASE}/property-performance/page-data`
	)
})

export const getLeaseAnalyticsPageData = cache(async () => {
	return serverFetch<LeaseAnalyticsPageResponse>(
		`${ENDPOINT_BASE}/lease/page-data`
	)
})

export const getMaintenanceInsightsPageData = cache(async () => {
	return serverFetch<MaintenanceAnalyticsPageResponse>(
		`${ENDPOINT_BASE}/maintenance/page-data`
	)
})

export const getOccupancyAnalyticsPageData = cache(async () => {
	return serverFetch<OccupancyAnalyticsPageResponse>(
		`${ENDPOINT_BASE}/occupancy/page-data`
	)
})
