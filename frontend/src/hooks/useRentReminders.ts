import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'

interface RentReminder {
	id: string
	leaseId: string
	tenantId: string
	propertyName: string
	tenantName: string
	tenantEmail: string
	rentAmount: number
	dueDate: string
	reminderType: 'upcoming' | 'due' | 'overdue'
	daysToDue: number
	status: 'pending' | 'sent' | 'paid'
	createdAt: string
	sentAt?: string
}

interface RentReminderSettings {
	enableReminders: boolean
	daysBeforeDue: number // Days before rent is due to send reminder
	enableOverdueReminders: boolean
	overdueGracePeriod: number // Days after due date before overdue reminders
	autoSendReminders: boolean
}

const DEFAULT_SETTINGS: RentReminderSettings = {
	enableReminders: true,
	daysBeforeDue: 3,
	enableOverdueReminders: true,
	overdueGracePeriod: 5,
	autoSendReminders: false // Manual approval by default
}

export function useRentReminders() {
	const { user } = useAuth()
	const queryClient = useQueryClient()

	// Get rent reminders from backend
	const { data: rentRemindersData, isLoading } = useQuery({
		queryKey: ['rentReminders', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				return await apiClient.leases.getRentReminders()
			} catch (error) {
				logger.error('Failed to fetch rent reminders', error)
				throw error
			}
		},
		enabled: !!user?.id,
		refetchInterval: 1000 * 60 * 60 // Refetch every hour
	})

	const reminders = rentRemindersData?.reminders || []
	const backendStats = rentRemindersData?.stats

	// Send rent reminder email
	const sendReminderMutation = useMutation({
		mutationFn: async (reminder: RentReminder) => {
			try {
				const response = await apiClient.leases.sendRentReminder(
					reminder.id
				)
				logger.info('Rent reminder sent successfully', undefined, {
					reminderId: reminder.id
				})
				return {
					...reminder,
					status: 'sent' as const,
					sentAt: response.sentAt
				}
			} catch (error) {
				logger.error('Failed to send rent reminder', error)
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['rentReminders'] })
		}
	})

	// Send multiple reminders
	const sendBulkRemindersMutation = useMutation({
		mutationFn: async (reminderIds: string[]) => {
			try {
				const response =
					await apiClient.leases.sendBulkRentReminders(reminderIds)
				logger.info(
					`Bulk rent reminders sent: ${response.successful} successful, ${response.failed} failed`
				)
				return response
			} catch (error) {
				logger.error('Failed to send bulk rent reminders', error)
				throw error
			}
		},
		onSuccess: results => {
			queryClient.invalidateQueries({ queryKey: ['rentReminders'] })
			if (results.failed === 0) {
				logger.info(
					`Successfully sent ${results.successful} rent reminders`
				)
			} else {
				logger.warn(
					`Sent ${results.successful} reminders, ${results.failed} failed`
				)
			}
		}
	})

	// Use backend stats if available, otherwise calculate from reminders
	const stats = backendStats || {
		totalReminders: reminders.length,
		upcomingReminders: reminders.filter(r => r.reminderType === 'upcoming')
			.length,
		dueToday: reminders.filter(r => r.reminderType === 'due').length,
		overdue: reminders.filter(r => r.reminderType === 'overdue').length,
		totalRentAmount: reminders.reduce((sum, r) => sum + r.rentAmount, 0),
		overdueAmount: reminders
			.filter(r => r.reminderType === 'overdue')
			.reduce((sum, r) => sum + r.rentAmount, 0)
	}

	return {
		reminders,
		stats,
		isLoading,
		sendReminder: sendReminderMutation.mutate,
		sendBulkReminders: sendBulkRemindersMutation.mutate,
		isSending:
			sendReminderMutation.isPending ||
			sendBulkRemindersMutation.isPending
	}
}

export function useRentReminderSettings() {
	const { user } = useAuth()
	const queryClient = useQueryClient()

	// Get user's rent reminder settings
	const { data: settings = DEFAULT_SETTINGS } = useQuery({
		queryKey: ['rentReminderSettings', user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			// Default settings - in production would create user_settings table
			// For now, return default settings
			return DEFAULT_SETTINGS
		},
		enabled: !!user?.id
	})

	// Update rent reminder settings
	const updateSettingsMutation = useMutation({
		mutationFn: async (newSettings: Partial<RentReminderSettings>) => {
			// Settings update placeholder - in production would update user_settings table
			logger.info('Rent reminder settings updated', undefined, {
				settings: newSettings
			})
			return { ...settings, ...newSettings }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['rentReminderSettings']
			})
		}
	})

	return {
		settings,
		updateSettings: updateSettingsMutation.mutate,
		isUpdating: updateSettingsMutation.isPending
	}
}
