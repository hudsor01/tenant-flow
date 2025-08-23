import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/lib/api/notifications-api'
import type { Priority } from '@/services/notifications/types'

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const queryClient = useQueryClient()

  // Get notifications query
  const {
    data: notifications,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications()
  })

  // Get unread notifications query
  const {
    data: unreadNotifications,
    isLoading: isLoadingUnread
  } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.getNotifications({ unreadOnly: true })
  })

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: notificationApi.send.bind(notificationApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead.bind(notificationApi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Create maintenance notification mutation
  const createMaintenanceNotificationMutation = useMutation({
    mutationFn: ({
      ownerId,
      title,
      description,
      priority,
      propertyName,
      unitNumber,
      maintenanceId,
      actionUrl
    }: {
      ownerId: string
      title: string
      description: string
      priority: Priority
      propertyName: string
      unitNumber: string
      maintenanceId?: string
      actionUrl?: string
    }) => notificationApi.createMaintenanceNotification(
      ownerId,
      title,
      description,
      priority,
      propertyName,
      unitNumber,
      maintenanceId,
      actionUrl
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  return {
    // Data
    notifications,
    unreadNotifications,
    
    // Loading states
    isLoading,
    isLoadingUnread,
    
    // Error states
    error,
    
    // Actions
    createNotification: createNotificationMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    createMaintenanceNotification: createMaintenanceNotificationMutation.mutate,
    refetch,
    
    // Mutation states
    isCreating: createNotificationMutation.isPending,
    isMarkingRead: markAsReadMutation.isPending,
    isCreatingMaintenance: createMaintenanceNotificationMutation.isPending
  }
}