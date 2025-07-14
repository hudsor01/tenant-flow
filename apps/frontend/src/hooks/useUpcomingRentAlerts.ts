// Refactored: useUpcomingRentAlerts now uses tRPC for backend calls instead of legacy apiClient

import { useQuery } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import { useAuth } from '@/hooks/useAuth'

export interface RentAlert {
	id: string
	type: 'overdue' | 'due_soon' | 'missed_payment' | 'upcoming'
	severity: 'error' | 'warning' | 'info'
	title: string
	message: string
	dueDate: string
	amount: number
	daysOverdue?: number
	daysUntilDue?: number
	lease: {
		id: string
		rentAmount: number
		dueDay: number
		status: string
	}
	tenant: {
		id: string
		name: string
		email: string
	}
	property: {
		id: string
		name: string
	}
	unit: {
		id: string
		name: string
	}
}

// Safe rent alerts that won't crash on missing foreign keys
export function useUpcomingRentAlerts() {
	const { user } = useAuth()

	return useQuery({
		queryKey: ['rent-alerts', user?.id],
		queryFn: async (): Promise<RentAlert[]> => {
			if (!user?.id) return []

			try {
				// Use rent reminders from backend API via tRPC
				const rentRemindersData =
					await trpc.leases.getRentReminders.fetch()
				const reminders = rentRemindersData.reminders

				const alerts: RentAlert[] = reminders
					.filter(reminder => {
						// Only show alerts for reminders within 7 days
						return Math.abs(reminder.daysToDue) <= 7
					})
					.map(reminder => {
						let type: RentAlert['type']
						let severity: RentAlert['severity']
						let title: string
						let message: string

						if (reminder.reminderType === 'overdue') {
							type = 'overdue'
							severity = 'error'
							title = 'Rent Overdue'
							message = `Payment is ${Math.abs(reminder.daysToDue)} days overdue`
						} else if (reminder.reminderType === 'due') {
							type = 'due_soon'
							severity = 'warning'
							title = 'Rent Due Today'
							message = 'Payment is due today'
						} else if (reminder.daysToDue <= 3) {
							type = 'due_soon'
							severity = 'warning'
							title = 'Rent Due Soon'
							message = `Payment due in ${reminder.daysToDue} days`
						} else {
							type = 'upcoming'
							severity = 'info'
							title = 'Upcoming Rent Payment'
							message = `Payment due in ${reminder.daysToDue} days`
						}

						return {
							id: reminder.id,
							type,
							severity,
							title,
							message,
							dueDate: reminder.dueDate,
							amount: reminder.rentAmount,
							daysOverdue:
								reminder.daysToDue < 0
									? Math.abs(reminder.daysToDue)
									: undefined,
							daysUntilDue:
								reminder.daysToDue >= 0
									? reminder.daysToDue
									: undefined,
							lease: {
								id: reminder.leaseId,
								rentAmount: reminder.rentAmount,
								dueDay: new Date(reminder.dueDate).getDate(),
								status: 'ACTIVE'
							},
							tenant: {
								id: reminder.tenantId,
								name: reminder.tenantName,
								email: reminder.tenantEmail
							},
							property: {
								id: '',
								name: reminder.propertyName
							},
							unit: {
								id: '',
								name: 'Unit'
							}
						}
					})

				return alerts.sort((a, b) => {
					// Sort by severity, then by days until due
					const severityOrder = { error: 0, warning: 1, info: 2 }
					if (
						severityOrder[a.severity] !== severityOrder[b.severity]
					) {
						return (
							severityOrder[a.severity] -
							severityOrder[b.severity]
						)
					}
					return (a.daysUntilDue || 0) - (b.daysUntilDue || 0)
				})
			} catch (error) {
				console.error('Error in useUpcomingRentAlerts:', error)
				return []
			}
		},
		enabled: !!user?.id,
		retry: false
	})
}

export function useRentAlertCounts() {
	const { data: alerts = [] } = useUpcomingRentAlerts()

	const counts = {
		total: alerts.length,
		overdue: alerts.filter(a => a.type === 'overdue').length,
		due_soon: alerts.filter(a => a.type === 'due_soon').length,
		missed_payment: alerts.filter(a => a.type === 'missed_payment').length,
		upcoming: alerts.filter(a => a.type === 'upcoming').length
	}

	return counts
}
