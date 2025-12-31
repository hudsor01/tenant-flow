/**
 * Analytics Hooks & Query Options
 * TanStack Query hooks for analytics data with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import type {
	FinancialAnalyticsPageData,
	LeaseAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData
} from '@repo/shared/types/analytics-page-data'
import type { OwnerPaymentSummaryResponse } from '@repo/shared/types/api-contracts'

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Analytics query factory
 */
export const analyticsQueries = {
	// Base keys for cache invalidation
	all: () => ['analytics'] as const,
	financial: () => [...analyticsQueries.all(), 'financial'] as const,
	lease: () => [...analyticsQueries.all(), 'lease'] as const,
	maintenance: () => [...analyticsQueries.all(), 'maintenance'] as const,
	occupancy: () => [...analyticsQueries.all(), 'occupancy'] as const,
	overview: () => [...analyticsQueries.all(), 'overview'] as const,
	propertyPerformance: () =>
		[...analyticsQueries.all(), 'property-performance'] as const,
	paymentSummary: () => [...analyticsQueries.all(), 'payment-summary'] as const,

	// Query options
	financialPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.financial(),
			queryFn: () =>
				apiRequest<FinancialAnalyticsPageData>(
					'/api/v1/analytics/financial/page-data'
				),
			staleTime: 60_000 // 1 minute
		}),

	leasePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.lease(),
			queryFn: () =>
				apiRequest<LeaseAnalyticsPageData>('/api/v1/analytics/lease/page-data'),
			staleTime: 60_000
		}),

	maintenancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.maintenance(),
			queryFn: () =>
				apiRequest<MaintenanceInsightsPageData>(
					'/api/v1/analytics/maintenance/page-data'
				),
			staleTime: 60_000
		}),

	occupancyPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.occupancy(),
			queryFn: async (): Promise<OccupancyAnalyticsPageData> => {
				const rawData = await apiRequest<
					OccupancyAnalyticsPageData | { data: OccupancyAnalyticsPageData }
				>('/api/v1/owner/tenants/occupancy-trends')
				const data =
					'data' in rawData && rawData.data
						? rawData.data
						: (rawData as OccupancyAnalyticsPageData)

				// Ensure all required fields have defaults
				return {
					metrics: data.metrics ?? {
						currentOccupancy: 0,
						averageVacancyDays: 0,
						seasonalPeakOccupancy: 0,
						trend: 0
					},
					trends: data.trends ?? [],
					propertyPerformance: data.propertyPerformance ?? [],
					seasonalPatterns: data.seasonalPatterns ?? [],
					vacancyAnalysis: data.vacancyAnalysis ?? []
				}
			},
			staleTime: 60_000
		}),

	overviewPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.overview(),
			queryFn: async (): Promise<{
				financial: FinancialAnalyticsPageData
				maintenance: MaintenanceInsightsPageData
				lease: LeaseAnalyticsPageData
			}> => {
				// Fetch in parallel using apiRequest
				const [financialRaw, maintenanceRaw, leaseRaw] = await Promise.all([
					apiRequest<
						FinancialAnalyticsPageData | { data: FinancialAnalyticsPageData }
					>('/api/v1/analytics/financial/page-data'),
					apiRequest<
						MaintenanceInsightsPageData | { data: MaintenanceInsightsPageData }
					>('/api/v1/analytics/maintenance/page-data'),
					apiRequest<LeaseAnalyticsPageData | { data: LeaseAnalyticsPageData }>(
						'/api/v1/analytics/lease/page-data'
					)
				])

				return {
					financial:
						'data' in financialRaw && financialRaw.data
							? financialRaw.data
							: (financialRaw as FinancialAnalyticsPageData),
					maintenance:
						'data' in maintenanceRaw && maintenanceRaw.data
							? maintenanceRaw.data
							: (maintenanceRaw as MaintenanceInsightsPageData),
					lease:
						'data' in leaseRaw && leaseRaw.data
							? leaseRaw.data
							: (leaseRaw as LeaseAnalyticsPageData)
				}
			},
			staleTime: 60_000
		}),

	propertyPerformancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.propertyPerformance(),
			queryFn: () =>
				apiRequest<PropertyPerformancePageData>(
					'/api/v1/analytics/property-performance/page-data'
				),
			staleTime: 60_000
		}),

	ownerPaymentSummary: () =>
		queryOptions({
			queryKey: analyticsQueries.paymentSummary(),
			queryFn: () =>
				apiRequest<OwnerPaymentSummaryResponse>(
					'/api/v1/tenants/payments/summary'
				),
			staleTime: 30_000 // 30 seconds for payment data
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch financial analytics page data
 */
export function useFinancialAnalytics() {
	return useQuery(analyticsQueries.financialPageData())
}

/**
 * Hook to fetch lease analytics page data
 */
export function useLeaseAnalytics() {
	return useQuery(analyticsQueries.leasePageData())
}

/**
 * Hook to fetch maintenance insights page data
 */
export function useMaintenanceAnalytics() {
	return useQuery(analyticsQueries.maintenancePageData())
}

/**
 * Hook to fetch occupancy analytics page data
 */
export function useOccupancyAnalytics() {
	return useQuery(analyticsQueries.occupancyPageData())
}

/**
 * Hook to fetch analytics overview page data
 */
export function useAnalyticsOverview() {
	return useQuery(analyticsQueries.overviewPageData())
}

/**
 * Hook to fetch property performance page data
 */
export function usePropertyPerformanceAnalytics() {
	return useQuery(analyticsQueries.propertyPerformancePageData())
}

/**
 * Hook to fetch owner payment summary
 */
export function useOwnerPaymentSummary() {
	return useQuery(analyticsQueries.ownerPaymentSummary())
}
