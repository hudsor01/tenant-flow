import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  NotificationWithDetails,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQuery,
} from '../types/api'
import { toast } from 'sonner'

// Notifications list hook
export function useNotifications(query?: NotificationQuery) {
  return useQuery({
    queryKey: queryKeys.notifications.list(query ? { ...query } : {}),
    queryFn: () => apiClient.notifications.getAll(query as Record<string, unknown> | undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes (notifications should be relatively fresh)
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Unread notifications hook
export function useUnreadNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list({ read: false }),
    queryFn: () => apiClient.notifications.getAll({ read: false }),
    staleTime: 1 * 60 * 1000, // 1 minute for unread notifications
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Single notification hook
export function useNotification(id: string) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => apiClient.notifications.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Notification statistics hook
export function useNotificationStats() {
  return useQuery({
    queryKey: queryKeys.notifications.stats(),
    queryFn: () => apiClient.notifications.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Create notification mutation
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateNotificationDto) => apiClient.notifications.create(data),
    onSuccess: (newNotification: NotificationWithDetails) => {
      // Invalidate and refetch notifications list
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() })
      
      // Add the new notification to cache
      queryClient.setQueryData(
        queryKeys.notifications.detail(newNotification.id),
        newNotification
      )
      
      toast.success('Notification created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update notification mutation (primarily for marking as read)
export function useUpdateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationDto }) =>
      apiClient.notifications.update(id, data),
    onSuccess: (updatedNotification: NotificationWithDetails) => {
      // Update the notification in cache
      queryClient.setQueryData(
        queryKeys.notifications.detail(updatedNotification.id),
        updatedNotification
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Mark notification as read mutation
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.notifications.markAsRead(id),
    onSuccess: (updatedNotification: NotificationWithDetails) => {
      // Update the notification in cache
      queryClient.setQueryData(
        queryKeys.notifications.detail(updatedNotification.id),
        updatedNotification
      )
      
      // Invalidate lists to update read status
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete notification mutation
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.notifications.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove notification from cache
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.stats() })
      
      toast.success('Notification deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for notification management
export function useNotificationActions() {
  const createNotification = useCreateNotification()
  const updateNotification = useUpdateNotification()
  const markAsRead = useMarkNotificationAsRead()
  const deleteNotification = useDeleteNotification()

  return {
    create: createNotification,
    update: updateNotification,
    markAsRead,
    delete: deleteNotification,
    isLoading:
      createNotification.isPending ||
      updateNotification.isPending ||
      markAsRead.isPending ||
      deleteNotification.isPending,
  }
}

// Unread notifications count hook
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const stats = await apiClient.notifications.getStats()
      return stats.unread || 0
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Mark all notifications as read mutation
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // This would need to be implemented in the API
      // For now, we'll simulate marking all as read
      const notifications = await apiClient.notifications.getAll({ read: false })
      return Promise.all(
        notifications.map(notification => 
          apiClient.notifications.markAsRead(notification.id)
        )
      )
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete all read notifications mutation
export function useDeleteAllReadNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // This would need to be implemented in the API
      // For now, we'll simulate deleting all read notifications
      const notifications = await apiClient.notifications.getAll({ read: true })
      return Promise.all(
        notifications.map(notification => 
          apiClient.notifications.delete(notification.id)
        )
      )
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      toast.success('All read notifications deleted')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Hook for notification analysis
export function useNotificationAnalysis(notifications?: NotificationWithDetails[]) {
  return {
    totalNotifications: notifications?.length || 0,
    
    unreadCount: notifications?.filter(n => !n.read).length || 0,
    
    byType: notifications?.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
    
    byPriority: notifications?.reduce((acc, notification) => {
      acc[notification.priority] = (acc[notification.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
    
    highPriorityUnread: notifications?.filter(n => 
      !n.read && (n.priority === 'HIGH' || n.priority === 'URGENT')
    ) || [],
    
    recentNotifications: notifications
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ?.slice(0, 5) || [],
      
    notificationsByProperty: notifications?.reduce((acc, notification) => {
      const propertyId = notification.propertyId || 'unknown'
      if (!acc[propertyId]) {
        acc[propertyId] = []
      }
      acc[propertyId].push(notification)
      return acc
    }, {} as Record<string, NotificationWithDetails[]>) || {},
  }
}