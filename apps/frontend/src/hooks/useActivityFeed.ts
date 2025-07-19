import { useQuery } from '@tanstack/react-query'

export interface Activity {
	id: string
	userId: string
	action: string
	entityType: 'property' | 'tenant' | 'maintenance' | 'payment' | 'lease' | 'unit'
	entityId: string
	entityName?: string
	createdAt: string
	// Legacy compatibility fields
	priority?: 'low' | 'medium' | 'high'
	metadata?: Record<string, unknown>
}

/**
 * Simplified activity feed hook - returns empty data for now
 * since the activity system has been simplified to basic CRUD operations
 */
export function useActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['activityFeed', limit],
		queryFn: async (): Promise<{
			data: Activity[]
			isConnected: boolean
			hasNewActivities: boolean
		}> => {
			// Return empty data since the activity system is simplified
			// The frontend can be updated to use the new basic CRUD endpoints if needed
			return {
				data: [],
				isConnected: false,
				hasNewActivities: false
			}
		},
		staleTime: 5 * 60 * 1000,
		retry: false
	})
}

// Backward compatibility aliases
export function useRealtimeActivityFeed(limit = 10) {
	return useActivityFeed(limit)
}

export function useWebSocketActivityFeed(limit = 10) {
	return useActivityFeed(limit)
}

export function useActivityFeedActions(limit = 10) {
	const feedQuery = useActivityFeed(limit)

	return {
		data: feedQuery.data?.data || [],
		loading: feedQuery.isLoading,
		error: feedQuery.error,
		refresh: feedQuery.refetch,
		isConnected: false,
		hasNewActivities: false,
		markAllAsRead: () => {
			// No-op for simplified system
		},
		getByType: () => [],
		getRecent: () => [],
		getByEntity: () => []
	}
}