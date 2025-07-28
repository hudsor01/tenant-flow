import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/query-keys'
import { api } from '@/lib/api/axios-client'
import { useAuth } from './useAuth'

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
	const { user } = useAuth()
	
	return useQuery({
		queryKey: queryKeys.tenants.dashboard(),
		queryFn: async (): Promise<TenantDashboardData | null> => {
			// Note: Tenant dashboard API endpoint needs to be implemented in the backend
			// For now, returning null to avoid errors
			console.warn('Tenant dashboard API not yet implemented')
			return null
		},
		enabled: !!user,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: {
			title: string
			description: string
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
			unitId: string
		}) => {
			const response = await api.v1.maintenance.$post({
				json: data
			})
			
			if (!response.ok) {
				throw new Error('Failed to create maintenance request')
			}
			
			return response.json()
		},
		onSuccess: () => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: queryKeys.tenants.dashboard() })
		}
	})
}
