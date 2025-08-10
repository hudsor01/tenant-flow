/**
 * Tests for Leases API Hooks
 * Comprehensive test suite covering lease lifecycle, renewals, and property relationships
 */

import { vi } from 'vitest'

// Mock the API client module
vi.mock('@/lib/api-client')

// Mock shared utilities
vi.mock('@repo/shared')

import { renderHook, waitFor } from '@testing-library/react'
import { toast as _toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { createQueryAdapter, createMutationAdapter } from '@repo/shared'
import {
  useLeases,
  useLease,
  useLeasesByProperty,
  useCreateLease,
  useUpdateLease,
  useDeleteLease,
  useRenewLease
} from '../use-leases'
import {
  createTestQueryClient,
  createHookWrapper,
  mockApiClient,
  createMockApiResponse,
  createMockLease,
  createApiError,
  expectSuccessToast,
  expectErrorToast,
  setupSuccessfulQuery,
  setupFailedQuery,
  setupSuccessfulMutation,
  setupFailedMutation
} from '@/test/utils/test-utils'

// Setup mocks after imports
const mockApiClientInstance = vi.mocked(apiClient)
Object.assign(mockApiClientInstance, mockApiClient)
vi.mocked(createQueryAdapter).mockImplementation((params) => params)
vi.mocked(createMutationAdapter).mockImplementation((data) => data)

describe('Leases API Hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  describe('useLeases', () => {
    it('should fetch leases successfully', async () => {
      const mockLeases = [
        createMockLease({ id: 'lease-1', rentAmount: 1000, status: 'ACTIVE' }),
        createMockLease({ id: 'lease-2', rentAmount: 1200, status: 'PENDING' })
      ]
      
      setupSuccessfulQuery(mockLeases)

      const { result } = renderHook(() => useLeases(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLeases)
      expect(mockApiClient.get).toHaveBeenCalledWith('/leases', { params: undefined })
    })

    it('should handle query parameters correctly', async () => {
      const mockLeases = [createMockLease()]
      const queryParams = { unitId: 'unit-1', status: 'ACTIVE', tenantId: 'tenant-1' }
      
      setupSuccessfulQuery(mockLeases)

      const { result } = renderHook(() => useLeases(queryParams), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/leases', { 
        params: queryParams 
      })
    })

    it('should handle API errors', async () => {
      setupFailedQuery(createApiError(500, 'Server error'))

      const { result } = renderHook(() => useLeases(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should handle enabled option correctly', async () => {
      const { result } = renderHook(() => useLeases(undefined, { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle empty leases list', async () => {
      setupSuccessfulQuery([])

      const { result } = renderHook(() => useLeases(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useLease', () => {
    const mockLease = createMockLease({ id: 'lease-1' })

    it('should fetch single lease successfully', async () => {
      setupSuccessfulQuery(mockLease)

      const { result } = renderHook(() => useLease('lease-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLease)
      expect(mockApiClient.get).toHaveBeenCalledWith('/leases/lease-1')
    })

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useLease(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useLease('lease-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle 404 errors', async () => {
      setupFailedQuery(createApiError(404, 'Lease not found'))

      const { result } = renderHook(() => useLease('nonexistent'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useLeasesByProperty', () => {
    const mockLeases = [
      createMockLease({ id: 'lease-1', unitId: 'unit-1' }),
      createMockLease({ id: 'lease-2', unitId: 'unit-2' })
    ]

    it('should fetch leases by property successfully', async () => {
      setupSuccessfulQuery(mockLeases)

      const { result } = renderHook(() => useLeasesByProperty('prop-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLeases)
      expect(mockApiClient.get).toHaveBeenCalledWith('/properties/prop-1/leases')
    })

    it('should not fetch when propertyId is empty', () => {
      const { result } = renderHook(() => useLeasesByProperty(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useLeasesByProperty('prop-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle properties with no leases', async () => {
      setupSuccessfulQuery([])

      const { result } = renderHook(() => useLeasesByProperty('prop-empty'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('should handle properties with expired leases', async () => {
      const expiredLeases = [
        createMockLease({ 
          id: 'lease-1', 
          status: 'EXPIRED',
          endDate: '2023-12-31'
        })
      ]
      
      setupSuccessfulQuery(expiredLeases)

      const { result } = renderHook(() => useLeasesByProperty('prop-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(expiredLeases)
    })
  })

  describe('useCreateLease', () => {
    const newLease = {
      unitId: 'unit-1',
      tenantId: 'tenant-1',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rentAmount: 1200,
      securityDeposit: 1800,
      terms: 'Standard lease terms and conditions'
    }
    const createdLease = createMockLease(newLease)

    it('should create lease successfully', async () => {
      setupSuccessfulMutation(createdLease)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newLease)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/leases', newLease)
      expect(result.current.data).toEqual(createdLease)
      expectSuccessToast('Lease created successfully')
    })

    it('should handle validation errors', async () => {
      const validationError = createApiError(422, 'End date must be after start date')
      setupFailedMutation(validationError)

      const invalidLease = { 
        ...newLease, 
        startDate: '2024-12-31',
        endDate: '2024-01-01'  // End date before start date
      }
      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(invalidLease)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to create lease')
    })

    it('should handle unit already occupied errors', async () => {
      const occupiedError = createApiError(409, 'Unit is already occupied')
      setupFailedMutation(occupiedError)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newLease)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(occupiedError)
    })

    it('should handle tenant with existing active lease errors', async () => {
      const activeLeaseError = createApiError(409, 'Tenant already has an active lease')
      setupFailedMutation(activeLeaseError)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newLease)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(activeLeaseError)
    })

    it('should perform optimistic updates with proper date handling', async () => {
      setupSuccessfulMutation(createdLease)

      // Add some initial data to query cache
      queryClient.setQueryData(['tenantflow', 'leases', 'list', undefined], [])

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newLease)

      // Check optimistic update immediately
      const cachedData = queryClient.getQueryData(['tenantflow', 'leases', 'list', undefined]) as Array<{ id: string }>
      expect(Array.isArray(cachedData)).toBe(true)
      
      if (cachedData && cachedData.length > 0) {
        const optimisticLease = cachedData[0]
        expect(optimisticLease.rentAmount).toBe(1200)
        expect(optimisticLease.createdAt).toBeInstanceOf(Date)
        expect(optimisticLease.updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('useUpdateLease', () => {
    const updateData = { rentAmount: 1300, terms: 'Updated lease terms' }
    const updatedLease = createMockLease({ ...updateData, id: 'lease-1' })

    it('should update lease successfully', async () => {
      setupSuccessfulMutation(updatedLease)

      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', data: updateData })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/leases/lease-1', updateData)
      expect(result.current.data).toEqual(updatedLease)
      expectSuccessToast('Lease updated successfully')
    })

    it('should handle update errors', async () => {
      const error = createApiError(404, 'Lease not found')
      setupFailedMutation(error)

      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', data: updateData })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to update lease')
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { securityDeposit: 2000 }
      const partiallyUpdatedLease = createMockLease({ ...partialUpdate, id: 'lease-1' })
      
      mockApiClient.put.mockResolvedValue(createMockApiResponse(partiallyUpdatedLease))

      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', data: partialUpdate })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/leases/lease-1', partialUpdate)
    })

    it('should handle rent increase validation', async () => {
      const rentIncreaseError = createApiError(422, 'Rent increase exceeds legal limit for this jurisdiction')
      setupFailedMutation(rentIncreaseError)

      const largeRentIncrease = { rentAmount: 10000 }  // Unrealistic increase
      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', data: largeRentIncrease })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(rentIncreaseError)
    })

    it('should handle date range validation on updates', async () => {
      const dateValidationError = createApiError(422, 'Lease end date cannot be before start date')
      setupFailedMutation(dateValidationError)

      const invalidDateUpdate = { 
        startDate: '2024-12-31',
        endDate: '2024-01-01'  // End before start
      }
      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', data: invalidDateUpdate })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(dateValidationError)
    })
  })

  describe('useDeleteLease', () => {
    it('should delete lease successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const { result } = renderHook(() => useDeleteLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('lease-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.delete).toHaveBeenCalledWith('/leases/lease-1')
      expectSuccessToast('Lease deleted successfully')
    })

    it('should handle deletion errors', async () => {
      const error = createApiError(409, 'Cannot delete lease with existing payment history')
      mockApiClient.delete.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('lease-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to delete lease')
    })

    it('should handle active lease deletion restrictions', async () => {
      const activeLeaseError = createApiError(409, 'Cannot delete active lease. Please terminate lease first.')
      mockApiClient.delete.mockRejectedValue(activeLeaseError)

      const { result } = renderHook(() => useDeleteLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('lease-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(activeLeaseError)
    })

    it('should perform optimistic removal', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      // Set up initial cache with some leases
      const initialLeases = [
        createMockLease({ id: 'lease-1' }),
        createMockLease({ id: 'lease-2' })
      ]
      queryClient.setQueryData(['tenantflow', 'leases', 'list', undefined], initialLeases)

      const { result } = renderHook(() => useDeleteLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('lease-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that lease was removed from cache
      const cachedData = queryClient.getQueryData(['tenantflow', 'leases', 'list', undefined]) as Array<{ id: string }>
      expect(cachedData).toHaveLength(1)
      expect(cachedData[0].id).toBe('lease-2')
    })
  })

  describe('useRenewLease', () => {
    const renewedLease = createMockLease({ 
      id: 'lease-1',
      endDate: '2025-12-31',  // Extended end date
      status: 'ACTIVE'
    })

    it('should renew lease successfully', async () => {
      setupSuccessfulMutation(renewedLease)

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      const renewalData = { id: 'lease-1', endDate: new Date('2025-12-31') }
      result.current.mutate(renewalData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/leases/lease-1/renew',
        { endDate: renewalData.endDate }
      )
      expect(result.current.data).toEqual(renewedLease)
      expectSuccessToast('Lease renewed successfully')
    })

    it('should handle renewal validation errors', async () => {
      const validationError = createApiError(422, 'Cannot renew expired lease')
      setupFailedMutation(validationError)

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-expired', endDate: new Date('2025-12-31') })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to renew lease')
    })

    it('should handle renewal date validation', async () => {
      const dateValidationError = createApiError(422, 'Renewal end date must be after current end date')
      setupFailedMutation(dateValidationError)

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Try to "renew" with an earlier date
      result.current.mutate({ id: 'lease-1', endDate: new Date('2020-12-31') })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(dateValidationError)
    })

    it('should handle lease not found errors', async () => {
      const notFoundError = createApiError(404, 'Lease not found')
      setupFailedMutation(notFoundError)

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', endDate: new Date('2025-12-31') })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(notFoundError)
    })

    it('should handle automatic rent increases on renewal', async () => {
      const renewedLeaseWithIncrease = createMockLease({ 
        id: 'lease-1',
        endDate: '2025-12-31',
        rentAmount: 1300,  // Increased from 1000
        status: 'ACTIVE'
      })

      mockApiClient.post.mockResolvedValue(createMockApiResponse(renewedLeaseWithIncrease))

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', endDate: new Date('2025-12-31') })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.rentAmount).toBe(1300)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed lease data', async () => {
      const malformedLease = {
        unitId: '',          // Empty required field
        tenantId: 'tenant-1',
        startDate: 'invalid-date',  // Invalid date format
        endDate: '2024-12-31',
        rentAmount: -500,    // Negative rent
        securityDeposit: 'invalid'  // Wrong data type
      }

      const validationError = createApiError(422, 'Invalid lease data')
      setupFailedMutation(validationError)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(malformedLease as Record<string, unknown>)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })

    it('should handle very long lease terms', async () => {
      const longTermLease = createMockLease({
        startDate: '2024-01-01',
        endDate: '2034-01-01',  // 10-year lease
        terms: 'A'.repeat(10000)  // Very long terms
      })

      setupSuccessfulMutation(longTermLease)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2034-01-01',
        rentAmount: 1000,
        securityDeposit: 1500,
        terms: 'A'.repeat(10000)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(longTermLease)
    })

    it('should handle short-term leases (month-to-month)', async () => {
      const shortTermLease = createMockLease({
        startDate: '2024-01-01',
        endDate: '2024-02-01',  // 1-month lease
        terms: 'Month-to-month rental agreement'
      })

      setupSuccessfulMutation(shortTermLease)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        rentAmount: 1000,
        securityDeposit: 1500,
        terms: 'Month-to-month rental agreement'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(shortTermLease)
    })

    it('should handle concurrent lease operations', async () => {
      const lease1 = createMockLease({ id: 'lease-1', unitId: 'unit-1' })
      const lease2 = createMockLease({ id: 'lease-2', unitId: 'unit-2' })
      
      mockApiClient.post
        .mockResolvedValueOnce(createMockApiResponse(lease1))
        .mockResolvedValueOnce(createMockApiResponse(lease2))

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Start two mutations concurrently
      const mutation1 = result.current.mutateAsync({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 1000,
        securityDeposit: 1500,
        terms: 'Standard lease'
      })
      
      const mutation2 = result.current.mutateAsync({
        unitId: 'unit-2',
        tenantId: 'tenant-2',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 1200,
        securityDeposit: 1800,
        terms: 'Standard lease'
      })

      const results = await Promise.all([mutation1, mutation2])

      expect(results[0]).toEqual(lease1)
      expect(results[1]).toEqual(lease2)
      expect(mockApiClient.post).toHaveBeenCalledTimes(2)
    })

    it('should handle timezone-sensitive date operations', async () => {
      const utcLease = createMockLease({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z'
      })

      setupSuccessfulMutation(utcLease)

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        rentAmount: 1000,
        securityDeposit: 1500,
        terms: 'UTC-aware lease'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(utcLease)
    })

    it('should handle lease renewal edge cases', async () => {
      // Test renewal exactly on lease end date
      const renewalOnEndDate = createMockLease({
        id: 'lease-1',
        endDate: '2024-12-31',
        status: 'ACTIVE'
      })

      mockApiClient.post.mockResolvedValue(createMockApiResponse(renewalOnEndDate))

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Mock current date to be exactly the end date
      const _originalDate = Date
      const mockDate = new Date('2024-12-31')
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as Date)

      result.current.mutate({ id: 'lease-1', endDate: new Date('2025-12-31') })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Restore original Date
      vi.restoreAllMocks()
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate lease queries after creation', async () => {
      setupSuccessfulMutation(createMockLease())

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitId: 'unit-1',
        tenantId: 'tenant-1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 1000,
        securityDeposit: 1500,
        terms: 'Standard lease'
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'leases'] 
      })
    })

    it('should invalidate lease queries after update', async () => {
      setupSuccessfulMutation(createMockLease())

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ 
        id: 'lease-1', 
        data: { rentAmount: 1300 } 
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'leases'] 
      })
    })

    it('should invalidate lease queries after deletion', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('lease-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'leases'] 
      })
    })

    it('should invalidate lease queries after renewal', async () => {
      const renewedLease = createMockLease({ endDate: '2025-12-31' })
      mockApiClient.post.mockResolvedValue(createMockApiResponse(renewedLease))

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useRenewLease(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'lease-1', endDate: new Date('2025-12-31') })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'leases'] 
      })
    })
  })
})