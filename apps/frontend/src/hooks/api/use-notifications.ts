import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post, put } from '@/lib/api-client-temp'
import { toast } from 'sonner'
import type { MaintenancePriority as Priority, Notification, CreateNotificationRequest } from '@repo/shared'

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
		queryFn: async () => get<Notification[]>('/api/notifications')
	})

	// Get unread notifications query
	const { data: unreadNotifications, isLoading: isLoadingUnread } = useQuery({
		queryKey: ['notifications', 'unread'],
		queryFn: async () =>
			get<Notification[]>('/api/notifications?unreadOnly=true')
	})

	// Create notification mutation - DIRECT usage per CLAUDE.md
	const createNotificationMutation = useMutation({
		mutationFn: (data: CreateNotificationRequest) => post<Notification>('/api/notifications', data),
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
		mutationFn: (id: string) => put<Notification>(`/api/notifications/${id}/read`, {}),
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
