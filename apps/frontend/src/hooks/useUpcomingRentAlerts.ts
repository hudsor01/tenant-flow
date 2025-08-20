/**
 * Hook for managing upcoming rent payment alerts
 * Provides notifications for upcoming, overdue, or late rent payments
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

export interface RentAlert {
	id: string
	leaseId: string
	tenantName: string
	propertyAddress: string
	unitNumber?: string
	title: string
	type: string
	amount: number
	dueDate: string
	status: 'upcoming' | 'due_today' | 'overdue'
	daysUntilDue: number
	daysOverdue: number
	severity: 'info' | 'warning' | 'error'
	message: string
	tenant: {
		name: string
		email?: string
		phone?: string
	}
	property: {
		name: string
		address: string
	}
	unit: {
		name: string
		number: string
	}
	lease: {
		rentAmount: number
		dueDate: string
	}
}

export function useUpcomingRentAlerts() {
	const { data: leases, isLoading } = useQuery({
		queryKey: ['leases', 'active'],
		queryFn: async () => {
			// TODO: Implement actual API call to fetch active leases
			// For now, return empty array to prevent runtime errors
			return []
		},
		staleTime: 5 * 60 * 1000 // 5 minutes
	})

	const alerts = useMemo(() => {
		if (!leases) return []

		// TODO: Process leases to generate rent alerts
		// This would identify upcoming due dates, overdue payments, etc.
		const rentAlerts: RentAlert[] = []

		return rentAlerts
	}, [leases])

	const upcomingAlerts = useMemo(
		() => alerts.filter(alert => alert.status === 'upcoming'),
		[alerts]
	)

	const overdueAlerts = useMemo(
		() => alerts.filter(alert => alert.status === 'overdue'),
		[alerts]
	)

	const dueTodayAlerts = useMemo(
		() => alerts.filter(alert => alert.status === 'due_today'),
		[alerts]
	)

	return {
		alerts,
		upcomingAlerts,
		overdueAlerts,
		dueTodayAlerts,
		isLoading,
		hasAlerts: alerts.length > 0,
		upcomingCount: upcomingAlerts.length,
		overdueCount: overdueAlerts.length,
		dueTodayCount: dueTodayAlerts.length,
		dueSoonCount: upcomingAlerts.length + dueTodayAlerts.length
	}
}