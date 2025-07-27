import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHonoClient } from '../lib/clients/hono-client'
import { handleApiError } from '@/lib/utils/css.utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { UnitQuery } from '@/types/query-types'
import type { 
  CreateUnitInput, 
  UpdateUnitInput 
} from '@tenantflow/shared'

// Helper to extract data from Hono response
async function extractHonoData<T>(response: Promise<Response>): Promise<T> {
  const res = await response
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || `HTTP ${res.status}`)
  }
  return res.json()
}

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
      const client = await getHonoClient()
      const params = new URLSearchParams()
      Object.entries(safeQuery).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      return extractHonoData(client.api.v1.units.$get({
        query: Object.fromEntries(params)
      }))
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
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.units.$get({
        query: { propertyId }
      }))
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
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.units[':id'].$get({
        param: { id }
      }))
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
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.units.$post({
        json: input
      }))
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] })
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['units', 'byProperty', variables.propertyId] })
      }
      toast.success(toastMessages.success.created('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Update unit mutation
export const useUpdateUnit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: UpdateUnitInput) => {
      const { id, ...updateData } = input
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.units[':id'].$put({
        param: { id },
        json: updateData
      }))
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', 'byId', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] })
      toast.success(toastMessages.success.updated('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Delete unit mutation
export const useDeleteUnit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.units[':id'].$delete({
        param: { id: variables.id }
      }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', 'list'] })
      toast.success(toastMessages.success.deleted('unit'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}