<<<<<<< HEAD
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/lib/api/notifications-api'
import { toast } from 'sonner'
import type { MaintenancePriority as Priority } from '@repo/shared'
// NotificationData import removed as it's not used in this component

/**
 * Hook for managing notifications - Direct TanStack Query usage per CLAUDE.md
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
		queryFn: async () => notificationApi.getNotifications()
	})

	// Get unread notifications query
	const { data: unreadNotifications, isLoading: isLoadingUnread } = useQuery({
		queryKey: ['notifications', 'unread'],
		queryFn: async () =>
			notificationApi.getNotifications({ unreadOnly: true })
	})

	// Create notification mutation - DIRECT usage per CLAUDE.md
	const createNotificationMutation = useMutation({
		mutationFn: notificationApi.send.bind(notificationApi),
		onSuccess: () => {
			toast.success('Notification sent successfully')
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => {
			toast.error('Failed to send notification')
		}
	})

	// Mark as read mutation - DIRECT usage per CLAUDE.md
	const markAsReadMutation = useMutation({
		mutationFn: notificationApi.markAsRead.bind(notificationApi),
		onSuccess: () => {
			toast.success('Notification marked as read')
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => {
			toast.error('Failed to mark notification as read')
		}
	})

	// Create maintenance notification mutation - DIRECT usage per CLAUDE.md
	const createMaintenanceNotificationMutation = useMutation({
		mutationFn: async ({
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
		}) =>
			notificationApi.createMaintenanceNotification(
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
			toast.success('Maintenance notification created')
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => {
			toast.error('Failed to create maintenance notification')
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
		createMaintenanceNotification:
			createMaintenanceNotificationMutation.mutate,
		refetch,

		// Mutation states
		isCreating: createNotificationMutation.isPending,
		isMarkingRead: markAsReadMutation.isPending,
		isCreatingMaintenance: createMaintenanceNotificationMutation.isPending
	}
}
=======
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
>>>>>>> origin/main
