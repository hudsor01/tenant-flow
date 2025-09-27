'use client'

import { visitorAnalyticsApi } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Visitor Analytics hooks - all calculations done server-side
 * Replaces frontend calculations from visitor-analytics-chart.tsx lines 103-145
 */

export function usePropertyInterest(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'property-interest', timeRange, propertyId],
		queryFn: async () => {
			return visitorAnalyticsApi.getPropertyInterest(timeRange, propertyId)
		},
		staleTime: 2 * 60 * 1000, // 2 minutes - visitor data should be relatively fresh
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3,
		refetchOnWindowFocus: true // Refresh visitor analytics on focus for up-to-date info
	})
}

export function useInquiryMetrics(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'inquiry-metrics', timeRange, propertyId],
		queryFn: async () => {
			return visitorAnalyticsApi.getInquiryMetrics(timeRange, propertyId)
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3,
		refetchOnWindowFocus: true
	})
}

export function useViewingMetrics(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'viewing-metrics', timeRange, propertyId],
		queryFn: async () => {
			return visitorAnalyticsApi.getViewingMetrics(timeRange, propertyId)
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3,
		refetchOnWindowFocus: true
	})
}

export function useComparativeAnalytics(currentPeriod = '30d', previousPeriod = '30d') {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'comparative', currentPeriod, previousPeriod],
		queryFn: async () => {
			return visitorAnalyticsApi.getComparativeAnalytics(currentPeriod, previousPeriod)
		},
		staleTime: 3 * 60 * 1000, // 3 minutes - comparative data changes less frequently
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: 3,
		refetchOnWindowFocus: false
	})
}

// Combined hook for visitor analytics dashboard
export function useVisitorAnalyticsDashboard(timeRange = '30d', propertyId?: string) {
	const propertyInterest = usePropertyInterest(timeRange, propertyId)
	const inquiryMetrics = useInquiryMetrics(timeRange, propertyId)
	const viewingMetrics = useViewingMetrics(timeRange, propertyId)

	return {
		propertyInterest,
		inquiryMetrics,
		viewingMetrics,
		isLoading: propertyInterest.isLoading || inquiryMetrics.isLoading || viewingMetrics.isLoading,
		error: propertyInterest.error || inquiryMetrics.error || viewingMetrics.error
	}
}