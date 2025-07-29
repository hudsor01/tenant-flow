// Hook for managing upcoming rent alerts and notifications
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { api } from '@/lib/api/axios-client'

export interface RentAlert {
	id: string
	tenantId: string
	tenantName: string
	propertyId: string
	propertyAddress: string
	amount: number
	dueDate: string
	daysOverdue: number
	severity: 'info' | 'warning' | 'error'
	type: 'upcoming' | 'overdue' | 'rent_due' | 'rent_overdue'
	title: string
	message: string
	property: {
		id: string
		name: string
	}
	unit: {
		id: string
		name: string
	}
	tenant: {
		id: string
		name: string
	}
	lease: {
		id: string
		rentAmount: number
	}
}

export interface RentAlertCounts {
	info: number
	warning: number
	error: number
	overdue: number
	due_soon: number
}

export function useUpcomingRentAlerts() {
	const { user } = useAuth()

	return useQuery({
		queryKey: ['rent-alerts', user?.id],
		queryFn: async (): Promise<RentAlert[]> => {
			try {
				const response = await api.v1.leases.$get()
				const data = await response.json()
				const leases = Array.isArray(data) ? data : data.leases || []

				// Generate rent alerts from lease data
				const today = new Date()
				const alerts: RentAlert[] = []

				leases.forEach((lease: { tenant?: { id: string; name: string }; unit?: { id: string; unitNumber: string }; property?: { id: string; name: string; address: string }; rentAmount?: number; id: string }) => {
					if (!lease.tenant || !lease.unit || !lease.property) return

					const rentDueDate = new Date()
					rentDueDate.setDate(1) // Assume rent due on 1st of month
					
					const daysUntilDue = Math.ceil((rentDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
					const isOverdue = daysUntilDue < 0
					const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0

					let severity: 'info' | 'warning' | 'error' = 'info'
					let type: 'upcoming' | 'overdue' | 'rent_due' | 'rent_overdue' = 'upcoming'

					if (isOverdue) {
						severity = 'error'
						type = 'rent_overdue'
					} else if (daysUntilDue <= 3) {
						severity = 'warning'
						type = 'rent_due'
					}

					alerts.push({
						id: `alert_${lease.id}`,
						tenantId: lease.tenant.id,
						tenantName: lease.tenant.name,
						propertyId: lease.property.id,
						propertyAddress: lease.property.address,
						amount: lease.rentAmount || 0,
						dueDate: rentDueDate.toISOString(),
						daysOverdue,
						severity,
						type,
						title: isOverdue ? `Rent Overdue: ${lease.tenant.name}` : `Rent Due Soon: ${lease.tenant.name}`,
						message: isOverdue 
							? `Rent payment is ${daysOverdue} days overdue`
							: `Rent payment due in ${daysUntilDue} days`,
						property: {
							id: lease.property.id,
							name: lease.property.name || lease.property.address
						},
						unit: {
							id: lease.unit.id,
							name: lease.unit.unitNumber || 'Unit'
						},
						tenant: {
							id: lease.tenant.id,
							name: lease.tenant.name
						},
						lease: {
							id: lease.id,
							rentAmount: lease.rentAmount || 0
						}
					})
				})

				return alerts
			} catch (error) {
				console.error('Failed to fetch rent alerts:', error)
				return []
			}
		},
		enabled: !!user,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 30 * 60 * 1000 // 30 minutes
	})
}

export function useRentAlertCounts(): RentAlertCounts | null {
	const { data: alerts } = useUpcomingRentAlerts()

	if (!alerts) return null

	return {
		info: alerts.filter(a => a.severity === 'info').length,
		warning: alerts.filter(a => a.severity === 'warning').length,
		error: alerts.filter(a => a.severity === 'error').length,
		overdue: alerts.filter(a => a.type === 'rent_overdue').length,
		due_soon: alerts.filter(a => a.type === 'rent_due').length
	}
}