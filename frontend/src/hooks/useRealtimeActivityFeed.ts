import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { ActivityItem } from '@/lib/api/activity-client'

export interface RealtimeActivity extends ActivityItem {
	isNew?: boolean
	timestamp?: string
}

export function useRealtimeActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['realtimeActivityFeed', limit],
		queryFn: async () => {
			const response = await apiClient.activity.getRealtime(limit)
			return {
				data: response.data,
				isLoading: false,
				error: null,
				isConnected: response.isConnected,
				hasNewActivities: response.hasNewActivities,
				markAllAsRead: () => {
					// This would need to be implemented in the backend
					// For now, just return empty function
				}
			}
		},
		staleTime: 30 * 1000, // 30 seconds
		refetchInterval: 30000, // Refresh every 30 seconds
		retry: false
	})
}
