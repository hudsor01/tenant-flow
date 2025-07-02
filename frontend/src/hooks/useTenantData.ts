import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/utils'

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
  upcomingPayments: Array<{
    id: string
    type: string
    amount: number
    dueDate: string
    status: string
  }>
  maintenanceRequests: Array<{
    id: string
    title: string
    description?: string
    status: string
    priority: string
    createdAt: string
    updatedAt: string
  }>
  paymentHistory: Array<{
    id: string
    amount: number
    paymentDate: string
    type: string
    status: string
  }>
}

export function useTenantData() {
  return useQuery({
    queryKey: queryKeys.tenants.dashboard(),
    queryFn: async (): Promise<TenantDashboardData | null> => {
      // TODO: This should be implemented as a dedicated API endpoint
      // For now, this is a placeholder that will need to be implemented
      // when the tenant portal API endpoints are ready
      throw new Error('Tenant dashboard API endpoint not yet implemented')
    },
    enabled: apiClient.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateMaintenanceRequest() {
  return async () => {
    // TODO: Implement maintenance request creation via API
    // This should be a dedicated API endpoint for creating maintenance requests
    throw new Error('Maintenance request API endpoint not yet implemented')
  }
}
