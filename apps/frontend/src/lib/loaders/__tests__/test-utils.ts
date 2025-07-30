/**
 * Test Utilities for Router Loaders
 * 
 * Provides mocks and utilities for testing loader functionality
 */

import { vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EnhancedRouterContext, UserContext } from '@/lib/router-context'
import { loaderErrorHandler } from '../error-handling'
import type { api } from '@/lib/api/axios-client'

/**
 * Create mock enhanced router context for testing
 */
export function createMockContext(overrides: Partial<EnhancedRouterContext> = {}): EnhancedRouterContext {
  const mockQueryClient = {
    ensureQueryData: vi.fn().mockResolvedValue([]),
    prefetchQuery: vi.fn().mockResolvedValue(undefined),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    removeQueries: vi.fn().mockResolvedValue(undefined)
  } as unknown as QueryClient
  
  const mockUser: UserContext = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'OWNER',
    organizationId: 'test-org-id',
    permissions: ['properties:read', 'properties:write', 'tenants:read', 'tenants:write'],
    subscription: {
      tier: 'professional',
      status: 'active',
      propertiesLimit: 50,
      tenantsLimit: 100,
      features: ['analytics', 'exports', 'maintenance']
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York'
    }
  }
  
  return {
    queryClient: mockQueryClient,
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    } as unknown as SupabaseClient,
    api: {
      auth: {
        login: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        logout: vi.fn().mockResolvedValue({ data: { message: 'Logged out' } }),
        me: vi.fn().mockResolvedValue({ data: mockUser })
      },
      properties: {
        list: vi.fn().mockResolvedValue({ data: mockApiResponses.properties.list }),
        get: vi.fn().mockResolvedValue({ data: mockApiResponses.properties.detail }),
        create: vi.fn().mockResolvedValue({ data: mockApiResponses.properties.detail }),
        update: vi.fn().mockResolvedValue({ data: mockApiResponses.properties.detail }),
        delete: vi.fn().mockResolvedValue({ data: { message: 'Deleted' } })
      },
      tenants: {
        list: vi.fn().mockResolvedValue({ data: mockApiResponses.tenants.list }),
        get: vi.fn().mockResolvedValue({ data: mockApiResponses.tenants.detail }),
        create: vi.fn().mockResolvedValue({ data: mockApiResponses.tenants.detail }),
        update: vi.fn().mockResolvedValue({ data: mockApiResponses.tenants.detail }),
        delete: vi.fn().mockResolvedValue({ data: { message: 'Deleted' } })
      },
      units: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ data: {} }),
        update: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: { message: 'Deleted' } })
      },
      maintenance: {
        list: vi.fn().mockResolvedValue({ data: mockApiResponses.maintenance.list }),
        create: vi.fn().mockResolvedValue({ data: {} }),
        update: vi.fn().mockResolvedValue({ data: {} })
      },
      billing: {
        createCheckoutSession: vi.fn().mockResolvedValue({ data: { url: 'https://checkout.stripe.com' } }),
        createPortalSession: vi.fn().mockResolvedValue({ data: { url: 'https://billing.stripe.com' } })
      }
    } as unknown as typeof api,
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    
    handleError: (error: unknown, context?: string) => {
      return loaderErrorHandler.handleError(error, context)
    },
    
    createRetryableFn: <T>(fn: () => Promise<T>) => fn(),
    
    hasPermission: (permission) => mockUser.permissions.includes(permission),
    hasAnyPermission: (permissions) => permissions.some(p => mockUser.permissions.includes(p)),
    hasAllPermissions: (permissions) => permissions.every(p => mockUser.permissions.includes(p)),
    
    canAccessFeature: (feature) => mockUser.subscription.features.includes(feature),
    isWithinLimit: (resource, current) => {
      if (resource === 'properties') return current < mockUser.subscription.propertiesLimit
      if (resource === 'tenants') return current < mockUser.subscription.tenantsLimit
      return true
    },
    
    preloadRoute: vi.fn().mockResolvedValue(undefined),
    warmCache: vi.fn().mockResolvedValue(undefined),
    
    ...overrides
  }
}

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  properties: {
    list: [
      { id: '1', name: 'Test Property 1', address: '123 Test St', type: 'SINGLE_FAMILY' },
      { id: '2', name: 'Test Property 2', address: '456 Test Ave', type: 'MULTI_FAMILY' }
    ],
    detail: { id: '1', name: 'Test Property 1', address: '123 Test St', type: 'SINGLE_FAMILY' },
    stats: { totalProperties: 2, totalUnits: 5, occupiedUnits: 3 }
  },
  tenants: {
    list: [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'ACTIVE' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'ACTIVE' }
    ],
    detail: { id: '1', name: 'John Doe', email: 'john@example.com', status: 'ACTIVE' }
  },
  maintenance: {
    list: [
      { id: '1', title: 'Leaky Faucet', status: 'OPEN', priority: 'MEDIUM' },
      { id: '2', title: 'Broken Window', status: 'IN_PROGRESS', priority: 'HIGH' }
    ]
  }
}

/**
 * Mock error scenarios for testing
 */
export const mockErrors = {
  network: new Error('Network error'),
  auth: { response: { status: 401, data: { message: 'Unauthorized' } } },
  permission: { response: { status: 403, data: { message: 'Forbidden' } } },
  validation: { response: { status: 400, data: { message: 'Validation error' } } },
  server: { response: { status: 500, data: { message: 'Internal server error' } } }
}

/**
 * Test loader performance
 */
export async function testLoaderPerformance<T>(
  loader: () => Promise<T>,
  expectedMaxTime: number = 1000
): Promise<{ result: T; loadTime: number; passed: boolean }> {
  const start = Date.now()
  const result = await loader()
  const loadTime = Date.now() - start
  const passed = loadTime <= expectedMaxTime
  
  return { result, loadTime, passed }
}

/**
 * Mock search parameters for testing
 */
export const mockSearchParams = {
  properties: {
    page: 1,
    limit: 20,
    search: 'test',
    type: 'SINGLE_FAMILY',
    status: 'ACTIVE',
    sortBy: 'name',
    sortOrder: 'asc' as const
  },
  tenants: {
    page: 1,
    limit: 20,
    search: 'john',
    status: 'ACTIVE',
    propertyId: 'prop-1',
    sortBy: 'name',
    sortOrder: 'desc' as const
  }
}

/**
 * Utility to test loader error handling
 */
export async function testLoaderErrorHandling<T>(
  loader: () => Promise<T>,
  expectedError: Error
): Promise<{ error: Error; handled: boolean }> {
  try {
    await loader()
    return { error: new Error('Test did not throw'), handled: false }
  } catch (error) {
    const isExpectedType = (error as Error).constructor === expectedError.constructor
    return { error: error as Error, handled: isExpectedType }
  }
}
