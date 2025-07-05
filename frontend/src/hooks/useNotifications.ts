import { useResource } from './useResource'
import { useRequest } from 'ahooks'
import { apiClient } from '@/lib/api-client'
import type { NotificationWithDetails } from '@/types/api'

/**
 * 🚀 NOTIFICATIONS REVOLUTION: ~120 lines → 20 lines (83% reduction!)
 */

// 🎯 Main notifications resource with real-time updates
export const useNotifications = () =>
	useResource<NotificationWithDetails>('notifications', {
		ready: !!apiClient.auth.isAuthenticated(),
		pollingInterval: 30000, // Real-time notifications every 30s
		cacheTime: 2 * 60 * 1000 // Short cache for notifications
	})

// 🎯 Unread notifications count
export const useUnreadNotifications = () =>
	useRequest(() => apiClient.notifications.getUnreadCount(), {
		cacheKey: 'unread-notifications-count',
		pollingInterval: 15000, // Check unread count every 15s
		ready: !!apiClient.auth.isAuthenticated()
	})
