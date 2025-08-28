import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Database } from '@repo/shared'

// Use NATIVE Supabase types - no duplication
type AppNotification = Database['public']['Tables']['notifications']['Row']
type CreateNotificationRequest = Database['public']['Tables']['notifications']['Insert']

/**
 * NATIVE Supabase Hook for managing notifications - Direct database access per CLAUDE.md
 * NO backend endpoints needed - uses native Supabase client directly
 */
export function useNotifications() {
	const queryClient = useQueryClient()

	// NATIVE Supabase query - get notifications
	const {
		data: notifications,
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: ['notifications'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('notifications')
				.select('*')
				.order('created_at', { ascending: false })
			
			if (error) throw error
			return data as AppNotification[]
		}
	})

	// NATIVE Supabase query - get unread notifications only
	const { data: unreadNotifications, isLoading: isLoadingUnread } = useQuery({
		queryKey: ['notifications', 'unread'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('notifications')
				.select('*')
				.eq('is_read', false)
				.order('created_at', { ascending: false })
			
			if (error) throw error
			return data as AppNotification[]
		}
	})

	// NATIVE Supabase create notification mutation - Direct database access
	const createNotificationMutation = useMutation({
		mutationFn: async (data: CreateNotificationRequest) => {
			const { data: result, error } = await supabase
				.from('notifications')
				.insert(data)
				.select('*')
				.single()
			
			if (error) throw error
			return result as AppNotification
		},
		onSuccess: () => {
			toast.success('Notification sent successfully')
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => {
			toast.error('Failed to send notification')
		}
	})

	// NATIVE Supabase mark as read mutation - Direct database update
	const markAsReadMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await supabase
				.from('notifications')
				.update({ 
					is_read: true, 
					read_at: new Date().toISOString() 
				})
				.eq('id', id)
				.select('*')
				.single()
			
			if (error) throw error
			return data as AppNotification
		},
		onSuccess: () => {
			toast.success('Notification marked as read')
			void queryClient.invalidateQueries({ queryKey: ['notifications'] })
		},
		onError: () => {
			toast.error('Failed to mark notification as read')
		}
	})

	// NATIVE Supabase maintenance notification mutation - Direct database insert
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
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
			propertyName: string
			unitNumber: string
			maintenanceId?: string
			actionUrl?: string
		}) => {
			// Build notification message with property context
			const message = `${description} at ${propertyName}${unitNumber ? ` - Unit ${unitNumber}` : ''}`
			
			const { data, error } = await supabase
				.from('notifications')
				.insert({
					recipient_id: ownerId,
					title,
					message,
					type: 'maintenance_request',
					priority: priority.toUpperCase(),
					action_url: actionUrl,
					data: {
						propertyName,
						unitNumber,
						maintenanceId,
						originalDescription: description
					}
				})
				.select('*')
				.single()
			
			if (error) throw error
			return data as AppNotification
		},
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
