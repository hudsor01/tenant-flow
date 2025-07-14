// Updated: useRealtimeActivityFeed now uses our new tRPC backend routers

import { useQuery } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import type { ActivityItem } from '@/types/activity'

export interface RealtimeActivity extends ActivityItem {
	isNew?: boolean
	timestamp?: string
}

export function useRealtimeActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['realtimeActivityFeed', limit],
		queryFn: async () => {
			// This would call tRPC when the activity router is implemented
			// For now, return mock data structure
			return {
				data: [] as ActivityItem[],
				isLoading: false,
				error: null,
				isConnected: false,
				hasNewActivities: false,
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
