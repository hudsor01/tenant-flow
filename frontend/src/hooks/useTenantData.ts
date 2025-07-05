import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/utils'

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
			// Tenant dashboard API endpoint placeholder
			// This will be implemented when tenant portal endpoints are ready
			return {
				currentLease: null,
				recentPayments: [],
				maintenanceRequests: [],
				documents: [],
				notifications: []
			}
		},
		enabled: apiClient.auth.isAuthenticated(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

export function useCreateMaintenanceRequest() {
	return async () => {
		// Maintenance request creation placeholder - will use API endpoint when available
		// This should be a dedicated API endpoint for creating maintenance requests
		throw new Error('Maintenance request API endpoint not yet implemented')
	}
}
