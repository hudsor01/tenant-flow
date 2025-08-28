import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
// Use Database types directly - no duplication
type AppNotification = Database['public']['Tables']['InAppNotification']['Row'] 
type CreateNotificationRequest = Database['public']['Tables']['InAppNotification']['Insert']
import type { Database } from '@repo/shared'
type Priority = Database['public']['Enums']['Priority']

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
		queryFn: async () => apiClient.get<AppNotification[]>('/api/notifications')
	})

	// Get unread notifications query
	const { data: unreadNotifications, isLoading: isLoadingUnread } = useQuery({
		queryKey: ['notifications', 'unread'],
		queryFn: async () =>
			apiClient.get<AppNotification[]>('/api/notifications?unreadOnly=true')
	})

	// Create notification mutation - DIRECT usage per CLAUDE.md
	const createNotificationMutation = useMutation({
		mutationFn: (data: CreateNotificationRequest) => apiClient.post<AppNotification>('/api/notifications', data),
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
		mutationFn: (id: string) => apiClient.put<AppNotification>(`/api/notifications/${id}/read`, {}),
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
			apiClient.post<AppNotification>('/api/notifications/maintenance', {
				ownerId,
				title,
				description,
				priority,
				propertyName,
				unitNumber,
				maintenanceId,
				actionUrl
			}),
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
