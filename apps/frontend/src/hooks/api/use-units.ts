/**
 * React Query hooks for Units
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
  type UseQueryResult,
  type UseMutationResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { 
  Unit, 
  UnitQuery, 
  CreateUnitInput, 
  UpdateUnitInput 
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { useQueryFactory, useListQuery, useDetailQuery, useMutationFactory } from '../query-factory'

/**
 * Fetch list of units with optional filters
 */
export function useUnits(
  query?: UnitQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Unit[], Error> {
  return useQueryFactory({
    queryKey: ['tenantflow', 'units', 'list', query],
    queryFn: async () => {
      const response = await apiClient.get<Unit[]>('/units', { 
        params: createQueryAdapter(query)
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Fetch single unit by ID
 */
export function useUnit(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Unit, Error> {
  return useDetailQuery(
    'units',
    Boolean(id) && (options?.enabled ?? true) ? id : undefined,
    async (id: string) => {
      const response = await apiClient.get<Unit>(`/units/${id}`)
      return response.data
    }
  )
}

/**
 * Fetch units by property ID
 */
export function useUnitsByProperty(
  propertyId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Unit[], Error> {
  return useDetailQuery(
    'units',
    Boolean(propertyId) && (options?.enabled ?? true) ? `property-${propertyId}` : undefined,
    async () => {
      const response = await apiClient.get<Unit[]>(`/properties/${propertyId}/units`)
      return response.data
    }
  )
}

/**
 * Create new unit with optimistic updates
 */
export function useCreateUnit(): UseMutationResult<
  Unit,
  Error,
  CreateUnitInput
> {
  return useMutationFactory({
    mutationFn: async (data: CreateUnitInput) => {
      const response = await apiClient.post<Unit>('/units', createMutationAdapter(data))
      return response.data
    },
    invalidateKeys: [queryKeys.units()],
    successMessage: 'Unit created successfully',
    errorMessage: 'Failed to create unit',
    optimisticUpdate: {
      queryKey: queryKeys.unitList(),
      updater: (oldData: unknown, variables: CreateUnitInput) => {
        const previousUnits = oldData as Unit[]
        const newUnit = {
          ...variables,
          id: `temp-${Date.now()}`,
          rent: 'monthlyRent' in variables ? variables.monthlyRent : 0,
          monthlyRent: 'monthlyRent' in variables ? variables.monthlyRent : 0,
          status: 'status' in variables ? (variables.status as string) : 'VACANT',
          lastInspectionDate: 'lastInspectionDate' in variables 
            ? (typeof variables.lastInspectionDate === 'string' 
                ? new Date(variables.lastInspectionDate) 
                : variables.lastInspectionDate as Date | null) 
            : null,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Unit
        return previousUnits ? [...previousUnits, newUnit] : [newUnit]
      }
    }
  })
}

/**
 * Update unit with optimistic updates
 */
export function useUpdateUnit(): UseMutationResult<
  Unit,
  Error,
  { id: string; data: UpdateUnitInput }
> {
  return useMutationFactory({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Unit>(
        `/units/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [queryKeys.units()],
    successMessage: 'Unit updated successfully',
    errorMessage: 'Failed to update unit'
  })
}

/**
 * Delete unit with optimistic updates
 */
export function useDeleteUnit(): UseMutationResult<
  void,
  Error,
  string
> {
  return useMutationFactory({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/units/${id}`)
    },
    invalidateKeys: [queryKeys.units()],
    successMessage: 'Unit deleted successfully',
    errorMessage: 'Failed to delete unit',
    optimisticUpdate: {
      queryKey: queryKeys.unitList(),
      updater: (oldData: unknown, id: string) => {
        const previousList = oldData as Unit[]
        return previousList ? previousList.filter(u => u.id !== id) : []
      }
    }
  })
}

/**
 * Update unit occupancy status
 */
export function useUpdateUnitOccupancy(): UseMutationResult<
  Unit,
  Error,
  { id: string; isOccupied: boolean }
> {
  return useMutationFactory({
    mutationFn: async ({ id, isOccupied }) => {
      const response = await apiClient.patch<Unit>(
        `/units/${id}/occupancy`,
        { isOccupied }
      )
      return response.data
    },
    invalidateKeys: [queryKeys.units()],
    successMessage: 'Unit occupancy updated',
    errorMessage: 'Failed to update unit occupancy',
    optimisticUpdate: {
      queryKey: queryKeys.unitList(),
      updater: (oldData: unknown, { id, isOccupied }) => {
        const previousList = oldData as Unit[]
        if (!previousList) return []
        return previousList.map(unit => 
          unit.id === id 
            ? { ...unit, status: isOccupied ? 'OCCUPIED' : 'VACANT' }
            : unit
        )
      }
    }
  })
}