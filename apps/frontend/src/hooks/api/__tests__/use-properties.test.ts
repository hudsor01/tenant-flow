/**
 * Tests for Properties API Hooks
 * Comprehensive test suite covering all CRUD operations, edge cases, and error scenarios
 */

// Mock the API client module
jest.mock('@/lib/api-client')

// Mock shared utilities
jest.mock('@repo/shared')

import { renderHook, waitFor } from '@testing-library/react'
import { apiClient } from '@/lib/api-client'
import { createQueryAdapter, createMutationAdapter } from '@repo/shared'
import {
  useProperties,
  useProperty,
  usePropertyStats,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  usePrefetchProperty
} from '../use-properties'
import {
  createTestQueryClient,
  createHookWrapper,
  mockApiClient,
  createMockApiResponse,
  createMockProperty,
  createApiError,
  expectSuccessToast,
  expectErrorToast,
  setupSuccessfulQuery,
  setupFailedQuery,
  setupSuccessfulMutation,
  setupFailedMutation
} from '@/test/utils/test-utils'

// Setup mocks after imports
const mockApiClientInstance = jest.mocked(apiClient)
Object.assign(mockApiClientInstance, mockApiClient)
jest.mocked(createQueryAdapter).mockImplementation((params) => params)
jest.mocked(createMutationAdapter).mockImplementation((data) => data)

describe('Properties API Hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllMocks()
  })

  describe('useProperties', () => {
    it('should fetch properties successfully', async () => {
      const mockProperties = [
        createMockProperty({ id: 'prop-1', name: 'Property 1' }),
        createMockProperty({ id: 'prop-2', name: 'Property 2' })
      ]
      
      setupSuccessfulQuery(mockProperties)

      const { result } = renderHook(() => useProperties(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockProperties)
      expect(mockApiClient.get).toHaveBeenCalledWith('/properties', { params: undefined })
    })

    it('should handle query parameters correctly', async () => {
      const mockProperties = [createMockProperty()]
      const queryParams = { city: 'San Francisco', type: 'RESIDENTIAL' }
      
      setupSuccessfulQuery(mockProperties)

      const { result } = renderHook(() => useProperties(queryParams), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/properties', { 
        params: queryParams 
      })
    })

    it('should return empty array on API error and log warning', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      setupFailedQuery(createApiError(500, 'Server error'))

      const { result } = renderHook(() => useProperties(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Properties API unavailable, returning empty list')
      
      consoleSpy.mockRestore()
    })

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      ;(networkError as Error & { code: string }).code = 'NETWORK_ERROR'
      setupFailedQuery(networkError)

      const { result } = renderHook(() => useProperties(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should handle enabled option correctly', async () => {
      const { result } = renderHook(() => useProperties(undefined, { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })
  })

  describe('useProperty', () => {
    const mockProperty = createMockProperty({ id: 'prop-1' })

    it('should fetch single property successfully', async () => {
      setupSuccessfulQuery(mockProperty)

      const { result } = renderHook(() => useProperty('prop-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockProperty)
      expect(mockApiClient.get).toHaveBeenCalledWith('/properties/prop-1')
    })

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useProperty(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useProperty('prop-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle 404 errors', async () => {
      setupFailedQuery(createApiError(404, 'Property not found'))

      const { result } = renderHook(() => useProperty('nonexistent'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('usePropertyStats', () => {
    const mockStats = {
      total: 10,
      occupied: 7,
      vacant: 3,
      occupancyRate: 0.7,
      totalMonthlyRent: 15000,
      averageRent: 1500
    }

    it('should fetch property statistics successfully', async () => {
      setupSuccessfulQuery(mockStats)

      const { result } = renderHook(() => usePropertyStats(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(mockApiClient.get).toHaveBeenCalledWith('/properties/stats')
    })

    it('should handle stats calculation edge cases', async () => {
      const edgeCaseStats = {
        total: 0,
        occupied: 0,
        vacant: 0,
        occupancyRate: 0,
        totalMonthlyRent: 0,
        averageRent: 0
      }
      setupSuccessfulQuery(edgeCaseStats)

      const { result } = renderHook(() => usePropertyStats(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(edgeCaseStats)
    })
  })

  describe('useCreateProperty', () => {
    const newProperty = {
      name: 'New Property',
      address: '456 New St',
      city: 'New City',
      state: 'NY',
      zipCode: '54321',
      type: 'COMMERCIAL' as const,
      units: 2
    }
    const createdProperty = createMockProperty(newProperty)

    it('should create property successfully', async () => {
      setupSuccessfulMutation(createdProperty)

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newProperty)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/properties', newProperty)
      expect(result.current.data).toEqual(createdProperty)
      expectSuccessToast('Property created successfully')
    })

    it('should handle creation errors', async () => {
      const error = createApiError(400, 'Invalid property data')
      setupFailedMutation(error)

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newProperty)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to create property')
    })

    it('should handle validation errors', async () => {
      const validationError = createApiError(422, 'Name is required')
      setupFailedMutation(validationError)

      const invalidProperty = { ...newProperty, name: '' }
      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(invalidProperty)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })

    it('should perform optimistic updates', async () => {
      setupSuccessfulMutation(createdProperty)

      // Add some initial data to query cache
      queryClient.setQueryData(['tenantflow', 'properties', 'list', undefined], [])

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newProperty)

      // Check optimistic update immediately
      const cachedData = queryClient.getQueryData(['tenantflow', 'properties', 'list', undefined])
      expect(Array.isArray(cachedData)).toBe(true)
    })
  })

  describe('useUpdateProperty', () => {
    const updateData = { name: 'Updated Property Name' }
    const updatedProperty = createMockProperty({ ...updateData, id: 'prop-1' })

    it('should update property successfully', async () => {
      setupSuccessfulMutation(updatedProperty)

      const { result } = renderHook(() => useUpdateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'prop-1', data: updateData })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/properties/prop-1', updateData)
      expect(result.current.data).toEqual(updatedProperty)
      expectSuccessToast('Property updated successfully')
    })

    it('should handle update errors', async () => {
      const error = createApiError(404, 'Property not found')
      setupFailedMutation(error)

      const { result } = renderHook(() => useUpdateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', data: updateData })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to update property')
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { city: 'Updated City' }
      const partiallyUpdatedProperty = createMockProperty({ ...partialUpdate, id: 'prop-1' })
      
      mockApiClient.put.mockResolvedValue(createMockApiResponse(partiallyUpdatedProperty))

      const { result } = renderHook(() => useUpdateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'prop-1', data: partialUpdate })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/properties/prop-1', partialUpdate)
    })
  })

  describe('useDeleteProperty', () => {
    it('should delete property successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const { result } = renderHook(() => useDeleteProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('prop-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.delete).toHaveBeenCalledWith('/properties/prop-1')
      expectSuccessToast('Property deleted successfully')
    })

    it('should handle deletion errors', async () => {
      const error = createApiError(409, 'Cannot delete property with active leases')
      mockApiClient.delete.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('prop-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to delete property')
    })

    it('should perform optimistic removal', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      // Set up initial cache with some properties
      const initialProperties = [
        createMockProperty({ id: 'prop-1' }),
        createMockProperty({ id: 'prop-2' })
      ]
      queryClient.setQueryData(['tenantflow', 'properties', 'list', undefined], initialProperties)

      const { result } = renderHook(() => useDeleteProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('prop-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that property was removed from cache
      const cachedData = queryClient.getQueryData(['tenantflow', 'properties', 'list', undefined]) as Array<{ id: string }>
      expect(cachedData).toHaveLength(1)
      expect(cachedData[0].id).toBe('prop-2')
    })
  })

  describe('usePrefetchProperty', () => {
    it('should prefetch property data', async () => {
      const mockProperty = createMockProperty({ id: 'prop-1' })
      setupSuccessfulQuery(mockProperty)

      const { result } = renderHook(() => usePrefetchProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current('prop-1')

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/properties/prop-1')
      })

      // Check that data was cached
      const cachedData = queryClient.getQueryData(['tenantflow', 'properties', 'detail', 'prop-1'])
      expect(cachedData).toEqual(mockProperty)
    })

    it('should handle prefetch errors gracefully', async () => {
      setupFailedQuery(createApiError(404, 'Property not found'))

      const { result } = renderHook(() => usePrefetchProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Should not throw error
      expect(() => result.current('nonexistent')).not.toThrow()
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle concurrent mutations', async () => {
      const property1 = createMockProperty({ id: 'prop-1', name: 'Property 1' })
      const property2 = createMockProperty({ id: 'prop-2', name: 'Property 2' })
      
      mockApiClient.post
        .mockResolvedValueOnce(createMockApiResponse(property1))
        .mockResolvedValueOnce(createMockApiResponse(property2))

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Start two mutations concurrently  
      const mutation1 = result.current.mutateAsync({ name: 'Property 1', address: '1 Test St', city: 'Test City', state: 'CA', zipCode: '12345', type: 'RESIDENTIAL' as const, units: 1 })
      const mutation2 = result.current.mutateAsync({ name: 'Property 2', address: '2 Test St', city: 'Test City', state: 'CA', zipCode: '12345', type: 'RESIDENTIAL' as const, units: 1 })

      const results = await Promise.all([mutation1, mutation2])

      expect(results[0]).toEqual(property1)
      expect(results[1]).toEqual(property2)
      expect(mockApiClient.post).toHaveBeenCalledTimes(2)
    })

    it('should handle rate limiting', async () => {
      const rateLimitError = createApiError(429, 'Too many requests')
      setupFailedMutation(rateLimitError)

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(createMockProperty())

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(rateLimitError)
    })

    it('should handle malformed API responses', async () => {
      mockApiClient.get.mockResolvedValue({ data: 'invalid-json' })

      const { result } = renderHook(() => useProperties(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should still handle gracefully due to error recovery in useProperties
      expect(result.current.data).toEqual([])
    })

    it('should handle very large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        createMockProperty({ id: `prop-${i}`, name: `Property ${i}` })
      )
      
      setupSuccessfulQuery(largeDataset)

      const { result } = renderHook(() => useProperties(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(1000)
    })

    it('should handle special characters in property data', async () => {
      const propertyWithSpecialChars = createMockProperty({
        name: 'Property with special chars: !@#$%^&*()_+ 汉字 🏠',
        address: '123 St-Germain-des-Prés, Café "L\'Été"'
      })
      
      setupSuccessfulQuery(propertyWithSpecialChars)

      const { result } = renderHook(() => useProperty('prop-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(propertyWithSpecialChars)
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate related queries after creation', async () => {
      setupSuccessfulMutation(createMockProperty())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(createMockProperty())

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties'] 
      })
      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties', 'stats'] 
      })
    })

    it('should invalidate related queries after update', async () => {
      setupSuccessfulMutation(createMockProperty())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'prop-1', data: { name: 'Updated' } })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties'] 
      })
      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties', 'stats'] 
      })
    })

    it('should invalidate related queries after deletion', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteProperty(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('prop-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties'] 
      })
      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'properties', 'stats'] 
      })
    })
  })
})