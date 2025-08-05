import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, handleApiError } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { 
    UnitQuery,
    CreateUnitInput, 
    UpdateUnitInput,
    Unit,
    UnitListResponse,
    SuccessResponse
} from '@tenantflow/shared'

// Main units resource
export const useUnits = (query?: UnitQuery) => {
  const safeQuery = query ? {
    ...query,
    limit: query.limit?.toString(),
    offset: query.offset?.toString()
  } : {}

  return useQuery({
    queryKey: ['units', 'list', safeQuery],
    queryFn: async () => {
      const response = await api.units.list(safeQuery)
      return response.data as UnitListResponse
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60000
  })
}

// Units by property with dedicated caching
export const useUnitsByProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['units', 'byProperty', propertyId],
    queryFn: async () => {
      const response = await api.units.list({ propertyId })
      return response.data as UnitListResponse
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000
  })
}

// Single unit with smart caching
export const useUnit = (id: string) => {
  return useQuery({
    queryKey: ['units', 'byId', id],
    queryFn: async () => {
      const response = await api.units.get(id)
      return response.data as Unit
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })
}

// Create unit mutation
export const useCreateUnit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: CreateUnitInput) => {
      const response = await api.units.create(input)
      return response.data as Unit
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['units', 'byProperty', variables.propertyId] }).catch(() => {
          // Invalidation failed, queries will stay stale
        })
      }
      toast.success(toastMessages.success.created('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Update unit mutation
export const useUpdateUnit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: UpdateUnitInput) => {
      const { id, ...updateData } = input
      const response = await api.units.update(id, updateData)
      return response.data as Unit
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', 'byId', variables.id] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.updated('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Delete unit mutation
export const useDeleteUnit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.units.delete(variables.id)
      return response.data as SuccessResponse<{ message: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.deleted('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}