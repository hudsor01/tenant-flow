'use client'

import { maintenanceApi } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Maintenance Analytics hooks - all calculations done server-side
 * Replaces frontend calculations from maintenance-analytics.tsx lines 224-238, 266
 */

export function useMaintenanceMetrics(propertyId?: string, timeframe = '30d', status?: string) {
	return useQuery({
		queryKey: ['maintenance', 'analytics', 'metrics', propertyId, timeframe, status],
		queryFn: async () => {
			return maintenanceApi.analytics.getMetrics(propertyId, timeframe, status)
		},
		staleTime: 3 * 60 * 1000, // 3 minutes - maintenance metrics don't change very frequently
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: 3,
		refetchOnWindowFocus: false
	})
}

export function useMaintenanceCostSummary(propertyId?: string, timeframe = '30d') {
	return useQuery({
		queryKey: ['maintenance', 'analytics', 'cost-summary', propertyId, timeframe],
		queryFn: async () => {
			return maintenanceApi.analytics.getCostSummary(propertyId, timeframe)
		},
		staleTime: 3 * 60 * 1000, // 3 minutes
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: 3,
		refetchOnWindowFocus: false
	})
}

export function useMaintenancePerformance(propertyId?: string, period = 'monthly') {
	return useQuery({
		queryKey: ['maintenance', 'analytics', 'performance', propertyId, period],
		queryFn: async () => {
			return maintenanceApi.analytics.getPerformance(propertyId, period)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - performance data changes less frequently
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 3,
		refetchOnWindowFocus: false
	})
}

// Combined hook for dashboard-style maintenance analytics
export function useMaintenanceDashboardAnalytics(propertyId?: string, timeframe = '30d') {
	const metrics = useMaintenanceMetrics(propertyId, timeframe)
	const costSummary = useMaintenanceCostSummary(propertyId, timeframe)
	const performance = useMaintenancePerformance(propertyId, 'monthly')

	return {
		metrics,
		costSummary,
		performance,
		isLoading: metrics.isLoading || costSummary.isLoading || performance.isLoading,
		error: metrics.error || costSummary.error || performance.error
	}
}