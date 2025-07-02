import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  UnitWithDetails,
  CreateUnitDto,
  UpdateUnitDto,
  UnitStats,
  UnitQuery,
} from '../types/api'
import { toast } from 'sonner'

// Units list hook
export function useUnits(query?: UnitQuery) {
  return useQuery({
    queryKey: queryKeys.units.list(query),
    queryFn: () => apiClient.units.getAll(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Units by property hook
export function useUnitsByProperty(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.units.list({ propertyId }),
    queryFn: () => apiClient.units.getAll({ propertyId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!propertyId && apiClient.auth.isAuthenticated(),
  })
}

// Single unit hook
export function useUnit(id: string) {
  return useQuery({
    queryKey: queryKeys.units.detail(id),
    queryFn: () => apiClient.units.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Unit statistics hook
export function useUnitStats() {
  return useQuery({
    queryKey: queryKeys.units.stats(),
    queryFn: () => apiClient.units.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Create unit mutation
export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateUnitDto) => apiClient.units.create(data),
    onSuccess: (newUnit: UnitWithDetails) => {
      // Invalidate and refetch units list
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.units.stats() })
      
      // Also invalidate property-specific queries
      if (newUnit.propertyId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.list({ propertyId: newUnit.propertyId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.properties.detail(newUnit.propertyId)
        })
      }
      
      // Add the new unit to cache
      queryClient.setQueryData(
        queryKeys.units.detail(newUnit.id),
        newUnit
      )
      
      toast.success('Unit created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update unit mutation
export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUnitDto }) =>
      apiClient.units.update(id, data),
    onSuccess: (updatedUnit: UnitWithDetails) => {
      // Update the unit in cache
      queryClient.setQueryData(
        queryKeys.units.detail(updatedUnit.id),
        updatedUnit
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.units.stats() })
      
      // Invalidate property-specific data
      if (updatedUnit.propertyId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.list({ propertyId: updatedUnit.propertyId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.properties.detail(updatedUnit.propertyId)
        })
      }
      
      toast.success('Unit updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete unit mutation
export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.units.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove unit from cache
      queryClient.removeQueries({ queryKey: queryKeys.units.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.units.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      
      toast.success('Unit deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for unit management
export function useUnitActions() {
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()
  const deleteUnit = useDeleteUnit()

  return {
    create: createUnit,
    update: updateUnit,
    delete: deleteUnit,
    isLoading:
      createUnit.isPending ||
      updateUnit.isPending ||
      deleteUnit.isPending,
  }
}