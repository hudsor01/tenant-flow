/**
 * React Query Client Configuration
 * Centralized configuration for optimal caching and performance
 */
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Global error handler for React Query
 */
function queryErrorHandler(error: unknown): void {
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred'
  
  // Only show errors for user-initiated actions
  if (message !== 'Network error' && !message.includes('401')) {
    toast.error(message)
  }
}

/**
 * Create and configure QueryClient with optimized defaults
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests 3 times with exponential backoff
        retry: (failureCount, error) => {
          if (failureCount >= 3) return false
          if (error instanceof Error) {
            // Don't retry on 4xx errors except 408 (timeout) and 429 (rate limit)
            if (error.message.includes('40') && 
                !error.message.includes('408') && 
                !error.message.includes('429')) {
              return false
            }
          }
          return true
        },
        // Exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus in production only
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        // Don't refetch on reconnect by default
        refetchOnReconnect: 'always',
      },
      mutations: {
        // Use global error handler
        onError: queryErrorHandler,
        // Retry mutations once
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

/**
 * Query key factory for consistent key generation
 */
export const queryKeys = {
  all: ['tenantflow'] as const,
  
  // Auth
  auth: () => [...queryKeys.all, 'auth'] as const,
  session: () => [...queryKeys.auth(), 'session'] as const,
  user: () => [...queryKeys.auth(), 'user'] as const,
  
  // Properties
  properties: () => [...queryKeys.all, 'properties'] as const,
  propertyList: (filters?: Record<string, unknown>) => 
    [...queryKeys.properties(), 'list', filters] as const,
  propertyDetail: (id: string) => 
    [...queryKeys.properties(), 'detail', id] as const,
  propertyStats: () => 
    [...queryKeys.properties(), 'stats'] as const,
  
  // Tenants
  tenants: () => [...queryKeys.all, 'tenants'] as const,
  tenantList: (filters?: Record<string, unknown>) => 
    [...queryKeys.tenants(), 'list', filters] as const,
  tenantDetail: (id: string) => 
    [...queryKeys.tenants(), 'detail', id] as const,
  
  // Leases
  leases: () => [...queryKeys.all, 'leases'] as const,
  leaseList: (filters?: Record<string, unknown>) => 
    [...queryKeys.leases(), 'list', filters] as const,
  leaseDetail: (id: string) => 
    [...queryKeys.leases(), 'detail', id] as const,
  leasesByProperty: (propertyId: string) => 
    [...queryKeys.leases(), 'by-property', propertyId] as const,
  
  // Units
  units: () => [...queryKeys.all, 'units'] as const,
  unitList: (filters?: Record<string, unknown>) => 
    [...queryKeys.units(), 'list', filters] as const,
  unitDetail: (id: string) => 
    [...queryKeys.units(), 'detail', id] as const,
  unitsByProperty: (propertyId: string) => 
    [...queryKeys.units(), 'by-property', propertyId] as const,
  
  // Maintenance
  maintenance: () => [...queryKeys.all, 'maintenance'] as const,
  maintenanceList: (filters?: Record<string, unknown>) => 
    [...queryKeys.maintenance(), 'list', filters] as const,
  maintenanceDetail: (id: string) => 
    [...queryKeys.maintenance(), 'detail', id] as const,
  
  // Dashboard
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  dashboardStats: () => 
    [...queryKeys.dashboard(), 'stats'] as const,
  dashboardOverview: () => 
    [...queryKeys.dashboard(), 'overview'] as const,
  dashboardActivity: () => 
    [...queryKeys.dashboard(), 'activity'] as const,
  
  // Billing
  billing: () => [...queryKeys.all, 'billing'] as const,
  subscription: () => 
    [...queryKeys.billing(), 'subscription'] as const,
  invoices: () => 
    [...queryKeys.billing(), 'invoices'] as const,
  paymentMethods: () => 
    [...queryKeys.billing(), 'payment-methods'] as const,
} as const

/**
 * Mutation key factory for consistent mutation identification
 */
export const mutationKeys = {
  // Properties
  createProperty: ['create-property'] as const,
  updateProperty: ['update-property'] as const,
  deleteProperty: ['delete-property'] as const,
  
  // Tenants
  createTenant: ['create-tenant'] as const,
  updateTenant: ['update-tenant'] as const,
  deleteTenant: ['delete-tenant'] as const,
  
  // Leases
  createLease: ['create-lease'] as const,
  updateLease: ['update-lease'] as const,
  deleteLease: ['delete-lease'] as const,
  
  // Units
  createUnit: ['create-unit'] as const,
  updateUnit: ['update-unit'] as const,
  deleteUnit: ['delete-unit'] as const,
  
  // Maintenance
  createMaintenanceRequest: ['create-maintenance'] as const,
  updateMaintenanceRequest: ['update-maintenance'] as const,
  deleteMaintenanceRequest: ['delete-maintenance'] as const,
  
  // Auth
  login: ['login'] as const,
  logout: ['logout'] as const,
  signup: ['signup'] as const,
  forgotPassword: ['forgot-password'] as const,
  resetPassword: ['reset-password'] as const,
  
  // Billing
  createCheckoutSession: ['create-checkout'] as const,
  cancelSubscription: ['cancel-subscription'] as const,
  updatePaymentMethod: ['update-payment-method'] as const,
} as const

// Export singleton instance for SSR
let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create new instance
    return createQueryClient()
  }
  // Browser: reuse instance
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient()
  }
  return browserQueryClient
}