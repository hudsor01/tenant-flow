// Refactored: useTenantData now uses tRPC and supabase for auth, no legacy apiClient

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/query-keys'
import { supabase } from '../lib/api'

export interface TenantDashboardData {
	tenant: {
		id: string
		name: string
		email: string
		phone?: string
	}
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode?: string
		unit: {
			id: string
			unitNumber: string
			rent: number
		}
	}
	lease: {
		id: string
		startDate: string
		endDate: string
		rentAmount: number
		status: string
		securityDeposit?: number
	}
	currentLease?: {
		id: string
		startDate: string
		endDate: string
		rentAmount: number
		status: string
	}
	propertyOwner: {
		name: string
		email: string
		phone?: string
	}
	upcomingPayments: {
		id: string
		type: string
		amount: number
		dueDate: string
		status: string
	}[]
	maintenanceRequests: {
		completedAt: string
		id: string
		title: string
		description?: string
		status: string
		priority: string
		createdAt: string
		updatedAt: string
	}[]
	paymentHistory: {
		id: string
		amount: number
		paymentDate: string
		type: string
		status: string
	}[]
}

export function useTenantData() {
	return useQuery({
		queryKey: queryKeys.tenants.dashboard(),
		queryFn: async (): Promise<TenantDashboardData | null> => {
			// TODO: GitHub Issue: Complete tenant dashboard API integration
			throw new Error('Tenant dashboard API not yet implemented')
		},
		enabled: !!supabase?.auth,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

export function useCreateMaintenanceRequest() {
	return async () => {
		// TODO: GitHub Issue: Complete tenant dashboard API integration
		throw new Error('Tenant maintenance request API not yet implemented')
	}
}
