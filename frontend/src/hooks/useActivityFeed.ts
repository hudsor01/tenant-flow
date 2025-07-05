import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Activity {
	id: string
	userId: string
	userName?: string
	action: string
	entityType:
		| 'property'
		| 'tenant'
		| 'maintenance'
		| 'payment'
		| 'lease'
		| 'unit'
	entityId: string
	entityName?: string
	metadata?: Record<string, unknown>
	createdAt: string
	priority?: 'low' | 'medium' | 'high'
}

export function useActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['activityFeed', limit],
		queryFn: async () => {
			const response = await apiClient.activity.getFeed(limit)
			return response.data
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false
	})
}
