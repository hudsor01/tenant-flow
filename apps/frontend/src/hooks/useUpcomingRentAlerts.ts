import { useMemo } from 'react'

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
	// Placeholder implementation - replace with actual data fetching
	const alerts = useMemo<RentAlert[]>(() => [], [])
	
	return {
		data: alerts,
		isLoading: false,
		error: null
	}
}

export function useRentAlertCounts() {
	// Placeholder implementation - replace with actual data fetching
	const counts = useMemo<RentAlertCounts>(() => ({
		info: 0,
		warning: 0,
		error: 0,
		overdue: 0,
		due_soon: 0
	}), [])
	
	return counts
}