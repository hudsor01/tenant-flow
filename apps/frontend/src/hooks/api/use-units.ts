/**
 * React Query hooks for Units
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys, mutationKeys } from '@/lib/react-query/query-client'
import type { 
  Unit, 
  UnitQuery, 
  CreateUnitInput, 
  UpdateUnitInput 
} from '@repo/shared'
import { toast } from 'sonner'

/**
 * Fetch list of units with optional filters
 */
export function useUnits(
  query?: UnitQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Unit[], Error> {
  return useQuery({
    queryKey: queryKeys.unitList(query),
    queryFn: async () => {
      const response = await apiClient.get<Unit[]>('/units', { 
        params: query 
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch single unit by ID
 */
export function useUnit(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Unit, Error> {
  return useQuery({
    queryKey: queryKeys.unitDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Unit>(`/units/${id}`)
      return response.data
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

/**
 * Fetch units by property ID
 */
export function useUnitsByProperty(
  propertyId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Unit[], Error> {
  return useQuery({
    queryKey: queryKeys.unitsByProperty(propertyId),
    queryFn: async () => {
      const response = await apiClient.get<Unit[]>(`/properties/${propertyId}/units`)
      return response.data
    },
    enabled: Boolean(propertyId) && (options?.enabled ?? true),
  })
}

/**
 * Create new unit with optimistic updates
 */
export function useCreateUnit(): UseMutationResult<
  Unit,
  Error,
  CreateUnitInput
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.createUnit,
    mutationFn: async (data: CreateUnitInput) => {
      const response = await apiClient.post<Unit>('/units', data)
      return response.data
    },
    onMutate: async (newUnit) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.units() 
      })

      const previousUnits = queryClient.getQueryData<Unit[]>(
        queryKeys.unitList()
      )

      if (previousUnits) {
        queryClient.setQueryData<Unit[]>(
          queryKeys.unitList(),
          [...previousUnits, { 
            ...newUnit,
            id: `temp-${Date.now()}`,
            rent: 'monthlyRent' in newUnit ? newUnit.monthlyRent : 0,
            monthlyRent: 'monthlyRent' in newUnit ? newUnit.monthlyRent : 0,
            status: 'status' in newUnit ? (newUnit.status as string) : 'VACANT',
            lastInspectionDate: 'lastInspectionDate' in newUnit 
              ? (typeof newUnit.lastInspectionDate === 'string' 
                  ? new Date(newUnit.lastInspectionDate) 
                  : newUnit.lastInspectionDate as Date | null) 
              : null,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Unit]
        )
      }

      // Update property-specific cache if propertyId exists
      if ('propertyId' in newUnit && newUnit.propertyId) {
        const previousPropertyUnits = queryClient.getQueryData<Unit[]>(
          queryKeys.unitsByProperty(newUnit.propertyId as string)
        )
        if (previousPropertyUnits) {
          queryClient.setQueryData<Unit[]>(
            queryKeys.unitsByProperty(newUnit.propertyId as string),
            [...previousPropertyUnits, { 
              ...newUnit,
              id: `temp-${Date.now()}`,
              rent: 'monthlyRent' in newUnit ? newUnit.monthlyRent : 0,
              monthlyRent: 'monthlyRent' in newUnit ? newUnit.monthlyRent : 0,
              status: 'status' in newUnit ? (newUnit.status as string) : 'VACANT',
              lastInspectionDate: 'lastInspectionDate' in newUnit 
                ? (typeof newUnit.lastInspectionDate === 'string' 
                    ? new Date(newUnit.lastInspectionDate) 
                    : newUnit.lastInspectionDate as Date | null) 
                : null,
              createdAt: new Date(),
              updatedAt: new Date()
            } as Unit]
          )
        }
      }

      return { previousUnits }
    },
    onError: (err, _, context) => {
      if (context?.previousUnits) {
        queryClient.setQueryData(
          queryKeys.unitList(),
          context.previousUnits
        )
      }
      toast.error('Failed to create unit')
    },
    onSuccess: (data, variables) => {
      toast.success('Unit created successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.units() 
      })
      // Invalidate property-specific queries
      if ('propertyId' in variables && variables.propertyId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.unitsByProperty(variables.propertyId as string) 
        })
      }
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updateUnit,
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Unit>(
        `/units/${id}`,
        data
      )
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.unitDetail(id) 
      })

      const previousUnit = queryClient.getQueryData<Unit>(
        queryKeys.unitDetail(id)
      )

      if (previousUnit) {
        queryClient.setQueryData<Unit>(
          queryKeys.unitDetail(id),
          { 
            ...previousUnit, 
            ...data,
            // Map monthlyRent to rent for compatibility
            rent: 'monthlyRent' in data && data.monthlyRent ? data.monthlyRent : previousUnit.rent,
            status: data.status ? (data.status as string) : previousUnit.status,
            // Convert lastInspectionDate to proper Date type
            lastInspectionDate: data.lastInspectionDate 
              ? (typeof data.lastInspectionDate === 'string' 
                  ? new Date(data.lastInspectionDate) 
                  : data.lastInspectionDate instanceof Date 
                    ? data.lastInspectionDate
                    : null)
              : previousUnit.lastInspectionDate
          }
        )
      }

      const previousList = queryClient.getQueryData<Unit[]>(
        queryKeys.unitList()
      )
      if (previousList) {
        queryClient.setQueryData<Unit[]>(
          queryKeys.unitList(),
          previousList.map(u => 
            u.id === id ? { 
              ...u, 
              ...data,
              // Map monthlyRent to rent for compatibility
              rent: 'monthlyRent' in data && data.monthlyRent ? data.monthlyRent : u.rent,
              status: data.status ? (data.status as string) : u.status,
              // Convert lastInspectionDate to proper Date type
              lastInspectionDate: data.lastInspectionDate 
                ? (typeof data.lastInspectionDate === 'string' 
                    ? new Date(data.lastInspectionDate) 
                    : data.lastInspectionDate instanceof Date 
                      ? data.lastInspectionDate
                      : null)
                : u.lastInspectionDate
            } : u
          )
        )
      }

      return { previousUnit, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousUnit) {
        queryClient.setQueryData(
          queryKeys.unitDetail(id),
          context.previousUnit
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.unitList(),
          context.previousList
        )
      }
      toast.error('Failed to update unit')
    },
    onSuccess: (data, { id }) => {
      toast.success('Unit updated successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.unitDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.unitList() 
      })
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.deleteUnit,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/units/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.units() 
      })

      const previousList = queryClient.getQueryData<Unit[]>(
        queryKeys.unitList()
      )

      if (previousList) {
        queryClient.setQueryData<Unit[]>(
          queryKeys.unitList(),
          previousList.filter(u => u.id !== id)
        )
      }

      return { previousList }
    },
    onError: (err, _, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.unitList(),
          context.previousList
        )
      }
      toast.error('Failed to delete unit')
    },
    onSuccess: () => {
      toast.success('Unit deleted successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.units() 
      })
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isOccupied }) => {
      const response = await apiClient.patch<Unit>(
        `/units/${id}/occupancy`,
        { isOccupied }
      )
      return response.data
    },
    onMutate: async ({ id, isOccupied }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.unitDetail(id) 
      })

      const previousUnit = queryClient.getQueryData<Unit>(
        queryKeys.unitDetail(id)
      )

      if (previousUnit) {
        queryClient.setQueryData<Unit>(
          queryKeys.unitDetail(id),
          { 
            ...previousUnit, 
            status: isOccupied ? 'OCCUPIED' : 'VACANT'
          }
        )
      }

      return { previousUnit }
    },
    onError: (err, { id }, context) => {
      if (context?.previousUnit) {
        queryClient.setQueryData(
          queryKeys.unitDetail(id),
          context.previousUnit
        )
      }
      toast.error('Failed to update unit occupancy')
    },
    onSuccess: (data, { id }) => {
      toast.success('Unit occupancy updated')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.unitDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.unitList() 
      })
    },
  })
}