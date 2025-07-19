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
	// TODO: Implement rent alerts data fetching
	// GitHub Issue: Build rent alerts system
	throw new Error('Rent alerts system not yet implemented')
}

export function useRentAlertCounts() {
	// TODO: Implement rent alert counts calculation
	// GitHub Issue: Build rent alerts system
	throw new Error('Rent alerts system not yet implemented')
}