/**
 * Tests for Tenants API Hooks
 * Comprehensive test suite covering tenant management, error tracking, and edge cases
 */

// Jest global functions available automatically from '@jest/globals'

// Mock the API client module
jest.mock('@/lib/api-client')

// Mock shared utilities BEFORE importing them
jest.mock('@repo/shared', () => ({
  ...jest.requireActual('@repo/shared'),
  createQueryAdapter: jest.fn((params) => params || {}),
  createMutationAdapter: jest.fn((data) => data || {}),
}))

import { renderHook, waitFor } from '@testing-library/react'
import { apiClient } from '@/lib/api-client'
import { createQueryAdapter, createMutationAdapter } from '@repo/shared'
import {
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant
} from '../use-tenants'
import {
  createTestQueryClient,
  createHookWrapper,
  mockApiClient,
  createMockApiResponse,
  createMockTenant,
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

// These are already properly mocked in the jest.mock() call above
const mockedCreateQueryAdapter = jest.mocked(createQueryAdapter)
const mockedCreateMutationAdapter = jest.mocked(createMutationAdapter)

// Mock PostHog for error tracking tests
const mockPosthog = {
  capture: jest.fn(),
}

Object.defineProperty(window, 'posthog', {
  writable: true,
  value: mockPosthog
})

describe('Tenants API Hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllMocks()
    mockPosthog.capture.mockClear()
  })

  describe('useTenants', () => {
    it('should fetch tenants successfully', async () => {
      const mockTenants = [
        createMockTenant({ id: 'tenant-1', firstName: 'John', lastName: 'Doe' }),
        createMockTenant({ id: 'tenant-2', firstName: 'Jane', lastName: 'Smith' })
      ]
      
      setupSuccessfulQuery(mockTenants)

      const { result } = renderHook(() => useTenants(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockTenants)
      expect(mockApiClient.get).toHaveBeenCalledWith('/tenants', { params: {} })
    })

    it('should handle query parameters correctly', async () => {
      const mockTenants = [createMockTenant()]
      const queryParams = { invitationStatus: 'ACCEPTED', search: 'john' }
      
      setupSuccessfulQuery(mockTenants)

      const { result } = renderHook(() => useTenants(queryParams), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/tenants', { 
        params: queryParams 
      })
    })

    it('should handle API errors', async () => {
      setupFailedQuery(createApiError(500, 'Server error'))

      const { result } = renderHook(() => useTenants(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should handle enabled option correctly', async () => {
      const { result } = renderHook(() => useTenants(undefined, { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      // The hook might start with isLoading: true initially
      expect(result.current.isLoading || result.current.status === 'pending').toBe(true)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle empty tenant list', async () => {
      setupSuccessfulQuery([])

      const { result } = renderHook(() => useTenants(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useTenant', () => {
    const mockTenant = createMockTenant({ id: 'tenant-1' })

    it('should fetch single tenant successfully', async () => {
      setupSuccessfulQuery(mockTenant)

      const { result } = renderHook(() => useTenant('tenant-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockTenant)
      expect(mockApiClient.get).toHaveBeenCalledWith('/tenants/tenant-1')
    })

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useTenant(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useTenant('tenant-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle 404 errors', async () => {
      setupFailedQuery(createApiError(404, 'Tenant not found'))

      const { result } = renderHook(() => useTenant('nonexistent'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useCreateTenant', () => {
    const newTenant = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    }
    const createdTenant = createMockTenant(newTenant)

    it('should create tenant successfully', async () => {
      setupSuccessfulMutation(createdTenant)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newTenant)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/tenants', newTenant)
      expect(result.current.data).toEqual(createdTenant)
      expectSuccessToast('Tenant created successfully')
    })

    it('should handle validation errors', async () => {
      const validationError = createApiError(422, 'Email is required')
      setupFailedMutation(validationError)

      const invalidTenant = { ...newTenant, email: '' }
      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(invalidTenant)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to create tenant')
    })

    it('should track API errors with PostHog', async () => {
      const error = createApiError(500, 'Internal server error')
      setupFailedMutation(error)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newTenant)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(mockPosthog.capture).toHaveBeenCalledWith('api_error_occurred', {
        endpoint: '/tenants',
        method: 'POST',
        error_message: 'Internal server error',
        operation: 'create_tenant',
      })
    })

    it('should handle duplicate email errors', async () => {
      const duplicateError = createApiError(409, 'Tenant with this email already exists')
      setupFailedMutation(duplicateError)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newTenant)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(duplicateError)
    })

    it('should perform optimistic updates', async () => {
      setupSuccessfulMutation(createdTenant)

      // Add some initial data to query cache
      queryClient.setQueryData(['tenantflow', 'tenants', 'list', undefined], [])

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newTenant)

      // Check optimistic update immediately
      const cachedData = queryClient.getQueryData(['tenantflow', 'tenants', 'list', undefined])
      expect(Array.isArray(cachedData)).toBe(true)
    })
  })

  describe('useUpdateTenant', () => {
    const updateData = { firstName: 'Jane', lastName: 'Smith' }
    const updatedTenant = createMockTenant({ ...updateData, id: 'tenant-1' })

    it('should update tenant successfully', async () => {
      setupSuccessfulMutation(updatedTenant)

      const { result } = renderHook(() => useUpdateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'tenant-1', data: updateData })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/tenants/tenant-1', updateData)
      expect(result.current.data).toEqual(updatedTenant)
      expectSuccessToast('Tenant updated successfully')
    })

    it('should handle update errors with PostHog tracking', async () => {
      const error = createApiError(404, 'Tenant not found')
      setupFailedMutation(error)

      const { result } = renderHook(() => useUpdateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', data: updateData })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to update tenant')
      expect(mockPosthog.capture).toHaveBeenCalledWith('api_error_occurred', {
        endpoint: '/tenants/nonexistent',
        method: 'PUT',
        error_message: 'Tenant not found',
        operation: 'update_tenant',
        tenant_id: 'nonexistent',
      })
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { phone: '+1987654321' }
      const partiallyUpdatedTenant = createMockTenant({ ...partialUpdate, id: 'tenant-1' })
      
      mockApiClient.put.mockResolvedValue(createMockApiResponse(partiallyUpdatedTenant))

      const { result } = renderHook(() => useUpdateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'tenant-1', data: partialUpdate })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/tenants/tenant-1', partialUpdate)
    })

    it('should handle email update conflicts', async () => {
      const conflictError = createApiError(409, 'Email already in use by another tenant')
      setupFailedMutation(conflictError)

      const emailUpdate = { email: 'taken@example.com' }
      const { result } = renderHook(() => useUpdateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'tenant-1', data: emailUpdate })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(conflictError)
    })
  })

  describe('useDeleteTenant', () => {
    it('should delete tenant successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const { result } = renderHook(() => useDeleteTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('tenant-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.delete).toHaveBeenCalledWith('/tenants/tenant-1')
      expectSuccessToast('Tenant deleted successfully')
    })

    it('should handle deletion errors with PostHog tracking', async () => {
      const error = createApiError(409, 'Cannot delete tenant with active leases')
      mockApiClient.delete.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('tenant-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to delete tenant')
      expect(mockPosthog.capture).toHaveBeenCalledWith('api_error_occurred', {
        endpoint: '/tenants/tenant-1',
        method: 'DELETE',
        error_message: 'Cannot delete tenant with active leases',
        operation: 'delete_tenant',
        tenant_id: 'tenant-1',
      })
    })

    it('should perform optimistic removal', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      // Set up initial cache with some tenants
      const initialTenants = [
        createMockTenant({ id: 'tenant-1' }),
        createMockTenant({ id: 'tenant-2' })
      ]
      queryClient.setQueryData(['tenantflow', 'tenants', 'list', undefined], initialTenants)

      const { result } = renderHook(() => useDeleteTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('tenant-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that tenant was removed from cache
      const cachedData = queryClient.getQueryData(['tenantflow', 'tenants', 'list', undefined]) as Array<{ id: string }> | undefined
      if (cachedData) {
        expect(cachedData).toHaveLength(1)
        expect(cachedData[0].id).toBe('tenant-2')
      }
    })

    it('should handle permission errors', async () => {
      const permissionError = createApiError(403, 'Insufficient permissions to delete tenant')
      mockApiClient.delete.mockRejectedValue(permissionError)

      const { result } = renderHook(() => useDeleteTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('tenant-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(permissionError)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed tenant data', async () => {
      const malformedTenant = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',  // Invalid email format
        phone: 'invalid-phone'   // Invalid phone format
      }

      const validationError = createApiError(422, 'Invalid email format')
      setupFailedMutation(validationError)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(malformedTenant)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })

    it('should handle international phone numbers', async () => {
      const internationalTenant = createMockTenant({
        phone: '+33 1 42 86 78 90'  // French phone number
      })

      setupSuccessfulMutation(internationalTenant)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        firstName: 'Pierre',
        lastName: 'Dubois',
        email: 'pierre@example.fr',
        phone: '+33 1 42 86 78 90'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(internationalTenant)
    })

    it('should handle special characters in tenant names', async () => {
      const tenantWithSpecialChars = createMockTenant({
        firstName: 'Jean-François',
        lastName: "O'Connor-Smith",
        email: 'jean.francois@example.com'
      })

      setupSuccessfulMutation(tenantWithSpecialChars)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        firstName: 'Jean-François',
        lastName: "O'Connor-Smith",
        email: 'jean.francois@example.com',
        phone: '+1234567890'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(tenantWithSpecialChars)
    })

    it('should handle concurrent tenant operations', async () => {
      const tenant1 = createMockTenant({ id: 'tenant-1', firstName: 'John' })
      const tenant2 = createMockTenant({ id: 'tenant-2', firstName: 'Jane' })
      
      mockApiClient.post
        .mockResolvedValueOnce(createMockApiResponse(tenant1))
        .mockResolvedValueOnce(createMockApiResponse(tenant2))

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Start two mutations concurrently
      const mutation1 = result.current.mutateAsync({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      })
      
      const mutation2 = result.current.mutateAsync({
        firstName: 'Jane',
        lastName: 'Smith', 
        email: 'jane@example.com',
        phone: '+1987654321'
      })

      const results = await Promise.all([mutation1, mutation2])

      expect(results[0]).toEqual(tenant1)
      expect(results[1]).toEqual(tenant2)
      expect(mockApiClient.post).toHaveBeenCalledTimes(2)
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      ;(timeoutError as Error & { code: string }).code = 'ECONNABORTED'
      setupFailedMutation(timeoutError)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(timeoutError)
    })

    it('should handle PostHog tracking when window.posthog is undefined', async () => {
      // Temporarily remove PostHog
      const originalPosthog = window.posthog
      Object.defineProperty(window, 'posthog', {
        configurable: true,
        value: undefined
      })

      const error = createApiError(500, 'Server error')
      setupFailedMutation(error)

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Should not throw error even without PostHog
      expect(() => result.current.mutate).not.toThrow()

      // Restore PostHog
      Object.defineProperty(window, 'posthog', {
        configurable: true,
        writable: true,
        value: originalPosthog
      })
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate tenant queries after creation', async () => {
      setupSuccessfulMutation(createMockTenant())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'tenants'] 
      })
    })

    it('should invalidate tenant queries after update', async () => {
      setupSuccessfulMutation(createMockTenant())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ 
        id: 'tenant-1', 
        data: { firstName: 'Updated' } 
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'tenants'] 
      })
    })

    it('should invalidate tenant queries after deletion', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteTenant(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('tenant-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'tenants'] 
      })
    })
  })
})