'use client'

// import { visitorAnalyticsApi } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

/**
 * Visitor Analytics hooks - DISABLED
 * Backend endpoints do not exist yet - these hooks will return placeholder data
 * TODO: Re-enable when visitor analytics backend endpoints are implemented
 */

export function usePropertyInterest(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'property-interest', timeRange, propertyId],
		queryFn: async () => {
			// Return placeholder data since backend endpoints don't exist
			return {
				data: [],
				message: 'Visitor analytics endpoints not yet implemented',
				success: false
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes - visitor data should be relatively fresh
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 0, // Don't retry since endpoints don't exist
		refetchOnWindowFocus: false,
		enabled: false // Disable queries since endpoints don't exist
	})
}

export function useInquiryMetrics(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'inquiry-metrics', timeRange, propertyId],
		queryFn: async () => {
			// Return placeholder data since backend endpoints don't exist
			return {
				data: [],
				message: 'Visitor analytics endpoints not yet implemented',
				success: false
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 0, // Don't retry since endpoints don't exist
		refetchOnWindowFocus: false,
		enabled: false // Disable queries since endpoints don't exist
	})
}

export function useViewingMetrics(timeRange = '30d', propertyId?: string) {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'viewing-metrics', timeRange, propertyId],
		queryFn: async () => {
			// Return placeholder data since backend endpoints don't exist
			return {
				data: [],
				message: 'Visitor analytics endpoints not yet implemented',
				success: false
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 0, // Don't retry since endpoints don't exist
		refetchOnWindowFocus: false,
		enabled: false // Disable queries since endpoints don't exist
	})
}

export function useComparativeAnalytics(currentPeriod = '30d', previousPeriod = '30d') {
	return useQuery({
		queryKey: ['analytics', 'visitor', 'comparative', currentPeriod, previousPeriod],
		queryFn: async () => {
			// Return placeholder data since backend endpoints don't exist
			return {
				data: [],
				message: 'Visitor analytics endpoints not yet implemented',
				success: false
			}
		},
		staleTime: 3 * 60 * 1000, // 3 minutes - comparative data changes less frequently
		gcTime: 15 * 60 * 1000, // 15 minutes
		retry: 0, // Don't retry since endpoints don't exist
		refetchOnWindowFocus: false,
		enabled: false // Disable queries since endpoints don't exist
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
		isLoading: false, // Never loading since queries are disabled
		error: null // No errors since queries are disabled
	}
}