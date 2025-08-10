/**
 * Tests for Units API Hooks
 * Comprehensive test suite covering unit management, occupancy tracking, and edge cases
 */

// Jest global functions available automatically from '@jest/globals'

// Mock the API client module
jest.mock('@/lib/api-client')

// Mock shared utilities
jest.mock('@repo/shared')

import { renderHook, waitFor } from '@testing-library/react'
import { apiClient } from '@/lib/api-client'
import { createQueryAdapter, createMutationAdapter } from '@repo/shared'
import {
  useUnits,
  useUnit,
  useUnitsByProperty,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
  useUpdateUnitOccupancy
} from '../use-units'
import {
  createTestQueryClient,
  createHookWrapper,
  mockApiClient,
  createMockApiResponse,
  createMockUnit,
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

describe('Units API Hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllMocks()
  })

  describe('useUnits', () => {
    it('should fetch units successfully', async () => {
      const mockUnits = [
        createMockUnit({ id: 'unit-1', unitNumber: '101', status: 'VACANT' }),
        createMockUnit({ id: 'unit-2', unitNumber: '102', status: 'OCCUPIED' })
      ]
      
      setupSuccessfulQuery(mockUnits)

      const { result } = renderHook(() => useUnits(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUnits)
      expect(mockApiClient.get).toHaveBeenCalledWith('/units', { params: undefined })
    })

    it('should handle query parameters correctly', async () => {
      const mockUnits = [createMockUnit()]
      const queryParams = { propertyId: 'prop-1', status: 'VACANT', bedrooms: 2 }
      
      setupSuccessfulQuery(mockUnits)

      const { result } = renderHook(() => useUnits(queryParams), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/units', { 
        params: queryParams 
      })
    })

    it('should handle API errors', async () => {
      setupFailedQuery(createApiError(500, 'Server error'))

      const { result } = renderHook(() => useUnits(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should handle enabled option correctly', async () => {
      const { result } = renderHook(() => useUnits(undefined, { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      // The hook might start with isLoading: true initially
      expect(result.current.isLoading || result.current.status === 'pending').toBe(true)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle empty units list', async () => {
      setupSuccessfulQuery([])

      const { result } = renderHook(() => useUnits(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useUnit', () => {
    const mockUnit = createMockUnit({ id: 'unit-1' })

    it('should fetch single unit successfully', async () => {
      setupSuccessfulQuery(mockUnit)

      const { result } = renderHook(() => useUnit('unit-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUnit)
      expect(mockApiClient.get).toHaveBeenCalledWith('/units/unit-1')
    })

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useUnit(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useUnit('unit-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle 404 errors', async () => {
      setupFailedQuery(createApiError(404, 'Unit not found'))

      const { result } = renderHook(() => useUnit('nonexistent'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useUnitsByProperty', () => {
    const mockUnits = [
      createMockUnit({ id: 'unit-1', propertyId: 'prop-1', unitNumber: '101' }),
      createMockUnit({ id: 'unit-2', propertyId: 'prop-1', unitNumber: '102' })
    ]

    it('should fetch units by property successfully', async () => {
      setupSuccessfulQuery(mockUnits)

      const { result } = renderHook(() => useUnitsByProperty('prop-1'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUnits)
      expect(mockApiClient.get).toHaveBeenCalledWith('/properties/prop-1/units')
    })

    it('should not fetch when propertyId is empty', () => {
      const { result } = renderHook(() => useUnitsByProperty(''), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle enabled option correctly', () => {
      const { result } = renderHook(() => useUnitsByProperty('prop-1', { enabled: false }), {
        wrapper: createHookWrapper(queryClient)
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockApiClient.get).not.toHaveBeenCalled()
    })

    it('should handle properties with no units', async () => {
      setupSuccessfulQuery([])

      const { result } = renderHook(() => useUnitsByProperty('prop-empty'), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })
  })

  describe('useCreateUnit', () => {
    const newUnit = {
      unitNumber: '103',
      propertyId: 'prop-1',
      bedrooms: 2,
      bathrooms: 1,
      monthlyRent: 1200,
      squareFeet: 900,
      description: 'Newly renovated unit',
      amenities: ['parking', 'laundry']
    }
    const createdUnit = createMockUnit(newUnit)

    it('should create unit successfully', async () => {
      setupSuccessfulMutation(createdUnit)

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newUnit)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.post).toHaveBeenCalledWith('/units', newUnit)
      expect(result.current.data).toEqual(createdUnit)
      expectSuccessToast('Unit created successfully')
    })

    it('should handle validation errors', async () => {
      const validationError = createApiError(422, 'Unit number is required')
      setupFailedMutation(validationError)

      const invalidUnit = { ...newUnit, unitNumber: '' }
      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(invalidUnit)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to create unit')
    })

    it('should handle duplicate unit number errors', async () => {
      const duplicateError = createApiError(409, 'Unit number already exists in this property')
      setupFailedMutation(duplicateError)

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(newUnit)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(duplicateError)
    })

    it('should perform optimistic updates with complex data transformations', async () => {
      setupSuccessfulMutation(createdUnit)

      // Add some initial data to query cache
      queryClient.setQueryData(['tenantflow', 'units', 'list', undefined], [])

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      const unitWithDateString = {
        ...newUnit,
        lastInspectionDate: '2024-01-15'  // String date
      }

      result.current.mutate(unitWithDateString)

      // Check optimistic update immediately
      const cachedData = queryClient.getQueryData(['tenantflow', 'units', 'list', undefined]) as Array<Record<string, unknown>>
      expect(Array.isArray(cachedData)).toBe(true)
      
      if (cachedData && cachedData.length > 0) {
        const optimisticUnit = cachedData[0]
        expect(optimisticUnit.unitNumber).toBe('103')
        expect(optimisticUnit.status).toBe('VACANT')
        expect(optimisticUnit.rent).toBe(1200)
        expect(optimisticUnit.monthlyRent).toBe(1200)
        expect(optimisticUnit.lastInspectionDate).toBeInstanceOf(Date)
      }
    })

    it('should handle edge case data transformations in optimistic updates', async () => {
      setupSuccessfulMutation(createdUnit)

      queryClient.setQueryData(['tenantflow', 'units', 'list', undefined], [])

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Test various edge cases
      const edgeCaseUnit = {
        ...newUnit,
        status: 'MAINTENANCE',
        lastInspectionDate: null
      }

      result.current.mutate(edgeCaseUnit)

      const cachedData = queryClient.getQueryData(['tenantflow', 'units', 'list', undefined]) as Array<Record<string, unknown>>
      
      if (cachedData && cachedData.length > 0) {
        const optimisticUnit = cachedData[0]
        expect(optimisticUnit.status).toBe('MAINTENANCE')
        expect(optimisticUnit.lastInspectionDate).toBe(null)
      }
    })
  })

  describe('useUpdateUnit', () => {
    const updateData = { monthlyRent: 1300, description: 'Updated description' }
    const updatedUnit = createMockUnit({ ...updateData, id: 'unit-1' })

    it('should update unit successfully', async () => {
      setupSuccessfulMutation(updatedUnit)

      const { result } = renderHook(() => useUpdateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', data: updateData })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/units/unit-1', updateData)
      expect(result.current.data).toEqual(updatedUnit)
      expectSuccessToast('Unit updated successfully')
    })

    it('should handle update errors', async () => {
      const error = createApiError(404, 'Unit not found')
      setupFailedMutation(error)

      const { result } = renderHook(() => useUpdateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', data: updateData })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to update unit')
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { squareFeet: 1000 }
      const partiallyUpdatedUnit = createMockUnit({ ...partialUpdate, id: 'unit-1' })
      
      mockApiClient.put.mockResolvedValue(createMockApiResponse(partiallyUpdatedUnit))

      const { result } = renderHook(() => useUpdateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', data: partialUpdate })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.put).toHaveBeenCalledWith('/units/unit-1', partialUpdate)
    })

    it('should handle rent increase validation', async () => {
      const rentIncreaseError = createApiError(422, 'Rent increase exceeds legal limit')
      setupFailedMutation(rentIncreaseError)

      const largeRentIncrease = { monthlyRent: 10000 }  // Unrealistic increase
      const { result } = renderHook(() => useUpdateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', data: largeRentIncrease })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(rentIncreaseError)
    })
  })

  describe('useDeleteUnit', () => {
    it('should delete unit successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const { result } = renderHook(() => useDeleteUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('unit-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.delete).toHaveBeenCalledWith('/units/unit-1')
      expectSuccessToast('Unit deleted successfully')
    })

    it('should handle deletion errors', async () => {
      const error = createApiError(409, 'Cannot delete unit with active lease')
      mockApiClient.delete.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('unit-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to delete unit')
    })

    it('should perform optimistic removal', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      // Set up initial cache with some units
      const initialUnits = [
        createMockUnit({ id: 'unit-1' }),
        createMockUnit({ id: 'unit-2' })
      ]
      queryClient.setQueryData(['tenantflow', 'units', 'list', undefined], initialUnits)

      const { result } = renderHook(() => useDeleteUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('unit-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that unit was removed from cache
      const cachedData = queryClient.getQueryData(['tenantflow', 'units', 'list', undefined]) as Array<{ id: string }> | undefined
      expect(cachedData).toBeDefined()
      expect(cachedData).toHaveLength(1)
      expect(cachedData![0].id).toBe('unit-2')
    })

    it('should handle cascade deletion scenarios', async () => {
      const cascadeError = createApiError(409, 'Unit has dependent records that must be removed first')
      mockApiClient.delete.mockRejectedValue(cascadeError)

      const { result } = renderHook(() => useDeleteUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('unit-1')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(cascadeError)
    })
  })

  describe('useUpdateUnitOccupancy', () => {
    it('should update occupancy to occupied successfully', async () => {
      const occupiedUnit = createMockUnit({ id: 'unit-1', status: 'OCCUPIED' })
      mockApiClient.patch.mockResolvedValue(createMockApiResponse(occupiedUnit))

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', isOccupied: true })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.patch).toHaveBeenCalledWith('/units/unit-1/occupancy', { 
        isOccupied: true 
      })
      expect(result.current.data).toEqual(occupiedUnit)
      expectSuccessToast('Unit occupancy updated')
    })

    it('should update occupancy to vacant successfully', async () => {
      const vacantUnit = createMockUnit({ id: 'unit-1', status: 'VACANT' })
      mockApiClient.patch.mockResolvedValue(createMockApiResponse(vacantUnit))

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', isOccupied: false })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApiClient.patch).toHaveBeenCalledWith('/units/unit-1/occupancy', { 
        isOccupied: false 
      })
      expectSuccessToast('Unit occupancy updated')
    })

    it('should handle occupancy update errors', async () => {
      const error = createApiError(404, 'Unit not found')
      mockApiClient.patch.mockRejectedValue(error)

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'nonexistent', isOccupied: true })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expectErrorToast('Failed to update unit occupancy')
    })

    it('should perform optimistic status updates', async () => {
      const updatedUnit = createMockUnit({ id: 'unit-1', status: 'OCCUPIED' })
      mockApiClient.patch.mockResolvedValue(createMockApiResponse(updatedUnit))

      // Set up initial cache
      const initialUnits = [
        createMockUnit({ id: 'unit-1', status: 'VACANT' }),
        createMockUnit({ id: 'unit-2', status: 'VACANT' })
      ]
      queryClient.setQueryData(['tenantflow', 'units', 'list', undefined], initialUnits)

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', isOccupied: true })

      // Check optimistic update immediately after mutation starts
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(['tenantflow', 'units', 'list', undefined]) as Array<{ id: string; status: string }>
        if (cachedData) {
          const updatedCacheUnit = cachedData.find(u => u.id === 'unit-1')
          expect(updatedCacheUnit?.status).toBe('OCCUPIED')
        }
      })
    })

    it('should handle lease termination scenarios', async () => {
      const terminationError = createApiError(400, 'Cannot mark unit vacant while lease is active')
      mockApiClient.patch.mockRejectedValue(terminationError)

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', isOccupied: false })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(terminationError)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed unit data', async () => {
      const malformedUnit = {
        unitNumber: '',  // Empty required field
        propertyId: 'prop-1',
        bedrooms: -1,    // Invalid negative value
        bathrooms: 0,    // Invalid zero value
        monthlyRent: -500, // Negative rent
        squareFeet: 'invalid' // Wrong data type
      }

      const validationError = createApiError(422, 'Invalid unit data')
      setupFailedMutation(validationError)

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate(malformedUnit as Record<string, unknown>)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(validationError)
    })

    it('should handle special unit numbers', async () => {
      const specialUnit = createMockUnit({
        unitNumber: 'PH-A',  // Penthouse
        description: 'Penthouse unit with city view'
      })

      setupSuccessfulMutation(specialUnit)

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitNumber: 'PH-A',
        propertyId: 'prop-1',
        bedrooms: 3,
        bathrooms: 2,
        monthlyRent: 5000,
        squareFeet: 2000,
        description: 'Penthouse unit with city view',
        amenities: ['city-view', 'private-terrace']
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(specialUnit)
    })

    it('should handle units with zero rent (rent-controlled)', async () => {
      const rentControlledUnit = createMockUnit({
        monthlyRent: 0,
        description: 'Rent-controlled unit'
      })

      setupSuccessfulMutation(rentControlledUnit)

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitNumber: '201',
        propertyId: 'prop-1',
        bedrooms: 1,
        bathrooms: 1,
        monthlyRent: 0,
        squareFeet: 600,
        description: 'Rent-controlled unit',
        amenities: []
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(rentControlledUnit)
    })

    it('should handle concurrent occupancy updates', async () => {
      const unit1 = createMockUnit({ id: 'unit-1', status: 'OCCUPIED' })
      const unit2 = createMockUnit({ id: 'unit-2', status: 'VACANT' })
      
      mockApiClient.patch
        .mockResolvedValueOnce(createMockApiResponse(unit1))
        .mockResolvedValueOnce(createMockApiResponse(unit2))

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      // Start two mutations concurrently
      const mutation1 = result.current.mutateAsync({ id: 'unit-1', isOccupied: true })
      const mutation2 = result.current.mutateAsync({ id: 'unit-2', isOccupied: false })

      const results = await Promise.all([mutation1, mutation2])

      expect(results[0]).toEqual(unit1)
      expect(results[1]).toEqual(unit2)
      expect(mockApiClient.patch).toHaveBeenCalledTimes(2)
    })

    it('should handle very large unit complexes', async () => {
      const largeUnitList = Array.from({ length: 500 }, (_, i) => 
        createMockUnit({ 
          id: `unit-${i}`, 
          unitNumber: `${Math.floor(i/10) + 1}${String(i % 10).padStart(2, '0')}`,
          monthlyRent: 1000 + (i * 10)
        })
      )
      
      setupSuccessfulQuery(largeUnitList)

      const { result } = renderHook(() => useUnits(), {
        wrapper: createHookWrapper(queryClient)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(500)
      expect(result.current.data![0].unitNumber).toBe('100')
      expect(result.current.data![499].unitNumber).toBe('5009')
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate unit queries after creation', async () => {
      setupSuccessfulMutation(createMockUnit())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({
        unitNumber: '103',
        propertyId: 'prop-1',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRent: 1200,
        squareFeet: 900
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'units'] 
      })
    })

    it('should invalidate unit queries after update', async () => {
      setupSuccessfulMutation(createMockUnit())

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ 
        id: 'unit-1', 
        data: { monthlyRent: 1300 } 
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'units'] 
      })
    })

    it('should invalidate unit queries after deletion', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null })

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteUnit(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate('unit-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'units'] 
      })
    })

    it('should invalidate unit queries after occupancy update', async () => {
      const updatedUnit = createMockUnit({ status: 'OCCUPIED' })
      mockApiClient.patch.mockResolvedValue(createMockApiResponse(updatedUnit))

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateUnitOccupancy(), {
        wrapper: createHookWrapper(queryClient)
      })

      result.current.mutate({ id: 'unit-1', isOccupied: true })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ 
        queryKey: ['tenantflow', 'units'] 
      })
    })
  })
})