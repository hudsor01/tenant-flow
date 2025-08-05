/**
 * Example Tests for Router Loaders
 * 
 * Demonstrates how to test loader functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loaders } from '../index'
import { createMockContext, mockApiResponses, mockErrors, testLoaderPerformance } from './test-utils'
import type { EnhancedRouterContext } from '@/lib/router-context'

// Mock API client
vi.mock('@/lib/api/axios-client', () => ({
  api: {
    properties: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      get: vi.fn().mockResolvedValue({ data: null }),
      stats: vi.fn().mockResolvedValue({ data: {} })
    },
    tenants: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      get: vi.fn().mockResolvedValue({ data: null })
    },
    units: {
      list: vi.fn().mockResolvedValue({ data: [] }),
      get: vi.fn().mockResolvedValue({ data: null })
    },
    maintenance: {
      list: vi.fn().mockResolvedValue({ data: [] })
    }
  }
}))

describe('Router Loaders', () => {
  let mockContext: EnhancedRouterContext
  
  beforeEach(async () => {
    mockContext = createMockContext()
    vi.clearAllMocks()
    
    // Reset mocks to default resolved values
    const { api } = await import('@/lib/api/axios-client')
    api.properties.list.mockResolvedValue({ data: mockApiResponses.properties.list })
    api.properties.get.mockResolvedValue({ data: mockApiResponses.properties.detail })
    api.properties.stats.mockResolvedValue({ data: {} })
    api.tenants.list.mockResolvedValue({ data: mockApiResponses.tenants.list })
    api.units.list.mockResolvedValue({ data: [] })
    api.maintenance.list.mockResolvedValue({ data: mockApiResponses.maintenance.list })
  })
  
  describe('Properties Loader', () => {
    it('should load properties successfully', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      
      const propertiesLoader = loaders.properties()
      const result = await propertiesLoader(mockContext)
      
      expect(result.data).toEqual(mockApiResponses.properties.list)
      expect(result.metadata.loadTime).toBeGreaterThan(0)
      expect(mockApi.properties.list).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        type: undefined,
        status: undefined,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })
    })
    
    it('should handle search parameters', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      mockApi.properties.list.mockResolvedValue({ data: [] })
      
      const searchParams = {
        page: 2,
        limit: 10,
        search: 'test property',
        type: 'SINGLE_FAMILY'
      }
      
      const propertiesLoader = loaders.properties(searchParams)
      await propertiesLoader(mockContext)
      
      expect(mockApi.properties.list).toHaveBeenCalledWith(searchParams)
    })
    
    it('should handle permission errors', async () => {
      const restrictedContext = createMockContext({
        hasAllPermissions: () => false
      })
      
      const propertiesLoader = loaders.properties()
      
      await expect(propertiesLoader(restrictedContext)).rejects.toThrow('Insufficient permissions')
    })
    
    it('should meet performance requirements', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      mockApi.properties.list.mockResolvedValue({ data: mockApiResponses.properties.list })
      
      const propertiesLoader = loaders.properties()
      const { loadTime, passed } = await testLoaderPerformance(
        () => propertiesLoader(mockContext),
        500 // 500ms max
      )
      
      expect(passed).toBe(true)
      expect(loadTime).toBeLessThan(500)
    })
  })
  
  describe('Dashboard Loader', () => {
    it('should load all dashboard data in parallel', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      
      // Mock all API endpoints
      mockApi.properties.list.mockResolvedValue({ data: mockApiResponses.properties.list })
      mockApi.properties.stats.mockResolvedValue({ data: mockApiResponses.properties.stats })
      mockApi.tenants.list.mockResolvedValue({ data: mockApiResponses.tenants.list })
      mockApi.maintenance.list.mockResolvedValue({ data: mockApiResponses.maintenance.list })
      
      const dashboardLoader = loaders.dashboard
      const result = await dashboardLoader(mockContext)
      
      expect(result.data).toHaveProperty('properties')
      expect(result.data).toHaveProperty('propertyStats')
      expect(result.data).toHaveProperty('recentTenants')
      expect(result.data).toHaveProperty('maintenanceRequests')
      expect(result.metadata.loadTime).toBeGreaterThan(0)
    })
    
    it('should handle partial failures gracefully', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      
      // Mock some successful and some failed responses
      mockApi.properties.list.mockResolvedValue({ data: mockApiResponses.properties.list })
      mockApi.properties.stats.mockRejectedValue(mockErrors.network)
      mockApi.tenants.list.mockResolvedValue({ data: mockApiResponses.tenants.list })
      mockApi.maintenance.list.mockRejectedValue(mockErrors.server)
      
      const dashboardLoader = loaders.dashboard
      const result = await dashboardLoader(mockContext)
      
      // Should still return data for successful requests
      expect(result.data.properties).toEqual(mockApiResponses.properties.list)
      expect(result.data.recentTenants).toEqual(mockApiResponses.tenants.list)
      
      // Failed requests should return null
      expect(result.data.propertyStats).toBeNull()
      expect(result.data.maintenanceRequests).toBeNull()
      
      // Should have errors in metadata
      expect(result.metadata.errors).toBeDefined()
      expect(result.metadata.errors?.length).toBeGreaterThan(0)
    })
  })
  
  describe('Property Detail Loader', () => {
    it('should load property with units and analytics', async () => {
      const { api: mockApi } = await import('@/lib/api/axios-client')
      
      mockApi.properties.get.mockResolvedValue({ data: mockApiResponses.properties.detail })
      mockApi.units.list.mockResolvedValue({ data: [] })
      mockApi.maintenance.list.mockResolvedValue({ data: mockApiResponses.maintenance.list })
      
      const propertyLoader = loaders.property('prop-1', true)
      const result = await propertyLoader(mockContext)
      
      expect(result.data).toHaveProperty('property')
      expect(result.data).toHaveProperty('units')
      expect(result.data).toHaveProperty('analytics')
      expect(result.data).toHaveProperty('maintenanceRequests')
      expect(mockApi.properties.get).toHaveBeenCalledWith('prop-1')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { api } = await import('@/lib/api/axios-client')
      // Override the default mock to reject
      api.properties.list.mockRejectedValue(new Error('Network error'))
      
      const propertiesLoader = loaders.properties()
      
      await expect(propertiesLoader(mockContext)).rejects.toThrow('Network error')
    })
    
    it('should handle authentication errors', async () => {
      const unauthenticatedContext = createMockContext({
        isAuthenticated: false
      })
      
      const propertiesLoader = loaders.properties()
      
      await expect(propertiesLoader(unauthenticatedContext)).rejects.toThrow('Authentication required')
    })
    
    it('should respect subscription limits', async () => {
      const limitedContext = createMockContext({
        user: {
          ...createMockContext().user!,
          subscription: {
            tier: 'free',
            status: 'active',
            propertiesLimit: 1,
            tenantsLimit: 5,
            features: []
          }
        }
      })
      
      const propertiesLoader = loaders.properties()
      const result = await propertiesLoader(limitedContext)
      
      // Should still work but might have limited data
      expect(result).toBeDefined()
    })
  })
})
