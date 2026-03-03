/**
 * Analytics Hooks & Query Options
 * TanStack Query hooks for analytics data with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type {
	FinancialAnalyticsPageData,
	LeaseAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
	PropertyPerformancePageData
} from '#shared/types/analytics-page-data'
import type { OwnerPaymentSummaryResponse } from '#shared/types/api-contracts'

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
			queryFn: async (): Promise<FinancialAnalyticsPageData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc('get_financial_overview', {
					p_user_id: user.id
				})
				if (error) handlePostgrestError(error, 'analytics')
				return data as FinancialAnalyticsPageData
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	leasePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.lease(),
			queryFn: async (): Promise<LeaseAnalyticsPageData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc(
					'get_occupancy_trends_optimized',
					{
						p_user_id: user.id,
						p_months: 12
					}
				)
				if (error) handlePostgrestError(error, 'analytics')
				return (data ?? {}) as unknown as LeaseAnalyticsPageData
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	maintenancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.maintenance(),
			queryFn: async (): Promise<MaintenanceInsightsPageData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc(
					'get_maintenance_analytics',
					{
						user_id: user.id
					}
				)
				if (error) handlePostgrestError(error, 'analytics')
				return data as MaintenanceInsightsPageData
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	occupancyPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.occupancy(),
			queryFn: async (): Promise<OccupancyAnalyticsPageData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc(
					'get_occupancy_trends_optimized',
					{
						p_user_id: user.id,
						p_months: 12
					}
				)
				if (error) handlePostgrestError(error, 'analytics')
				const raw = (data ?? {}) as Partial<OccupancyAnalyticsPageData>

				// Ensure all required fields have defaults
				return {
					metrics: raw.metrics ?? {
						currentOccupancy: 0,
						averageVacancyDays: 0,
						seasonalPeakOccupancy: 0,
						trend: 0
					},
					trends: raw.trends ?? [],
					propertyPerformance: raw.propertyPerformance ?? [],
					seasonalPatterns: raw.seasonalPatterns ?? [],
					vacancyAnalysis: raw.vacancyAnalysis ?? []
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	overviewPageData: () =>
		queryOptions({
			queryKey: analyticsQueries.overview(),
			queryFn: async (): Promise<{
				financial: FinancialAnalyticsPageData
				maintenance: MaintenanceInsightsPageData
				lease: LeaseAnalyticsPageData
			}> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const userId = user.id

				const [financialResult, maintenanceResult, occupancyResult] =
					await Promise.all([
						supabase.rpc('get_financial_overview', { p_user_id: userId }),
						supabase.rpc('get_maintenance_analytics', { user_id: userId }),
						supabase.rpc('get_occupancy_trends_optimized', {
							p_user_id: userId,
							p_months: 12
						})
					])

				if (financialResult.error)
					handlePostgrestError(financialResult.error, 'analytics')
				if (maintenanceResult.error)
					handlePostgrestError(maintenanceResult.error, 'analytics')
				if (occupancyResult.error)
					handlePostgrestError(occupancyResult.error, 'analytics')

				return {
					financial: financialResult.data as FinancialAnalyticsPageData,
					maintenance:
						maintenanceResult.data as MaintenanceInsightsPageData,
					lease: (occupancyResult.data ?? {}) as unknown as LeaseAnalyticsPageData
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	propertyPerformancePageData: () =>
		queryOptions({
			queryKey: analyticsQueries.propertyPerformance(),
			queryFn: async (): Promise<PropertyPerformancePageData> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc(
					'get_property_performance_analytics',
					{
						p_user_id: user.id
					}
				)
				if (error) handlePostgrestError(error, 'analytics')
				return data as PropertyPerformancePageData
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
		}),

	ownerPaymentSummary: () =>
		queryOptions({
			queryKey: analyticsQueries.paymentSummary(),
			queryFn: async (): Promise<OwnerPaymentSummaryResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase.rpc('get_billing_insights', {
					owner_id_param: user.id
				})
				if (error) handlePostgrestError(error, 'analytics')
				const raw = data as Record<string, unknown> | null
				return {
					lateFeeTotal:
						typeof raw?.lateFeeTotal === 'number' ? raw.lateFeeTotal : 0,
					unpaidTotal:
						typeof raw?.unpaidTotal === 'number' ? raw.unpaidTotal : 0,
					unpaidCount:
						typeof raw?.unpaidCount === 'number' ? raw.unpaidCount : 0,
					tenantCount:
						typeof raw?.tenantCount === 'number' ? raw.tenantCount : 0
				} as OwnerPaymentSummaryResponse
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000
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
