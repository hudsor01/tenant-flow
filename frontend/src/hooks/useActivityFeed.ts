import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ActivityItem } from '@/lib/api/activity-client'
import type { NotificationType } from '@/types/entities'

// Re-export ActivityItem as Activity for backwards compatibility
export type Activity = ActivityItem & {
	entityType: NotificationType
	metadata?: ActivityMetadata
	priority?: ActivityPriority
}

// Strongly typed metadata
interface ActivityMetadata {
	propertyName?: string
	unitNumber?: string | number
	amount?: string | number
	status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
	tenantName?: string
	leaseEndDate?: string
	maintenanceType?: string
	paymentMethod?: string
	[key: string]: unknown
}

type ActivityPriority = 'low' | 'medium' | 'high'

export function useActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['activityFeed', limit],
		queryFn: async () => {
			const response = await apiClient.activity.getFeed(limit)
			return response
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false
	})
}
