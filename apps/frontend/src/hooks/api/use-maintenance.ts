import { apiClient } from '@/lib/api-client'
/**
 * React Query hooks for Maintenance Requests
 * Native TanStack Query implementation - no custom abstractions
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { maintenanceApi, maintenanceKeys, type MaintenanceStats } from '@/lib/api/maintenance'
import type {
  MaintenanceRequest,
  MaintenanceQuery,
  CreateMaintenanceInput,
  UpdateMaintenanceInput
} from '@repo/shared'

/**
 * Fetch list of maintenance requests with optional filters
 */
export function useMaintenanceRequests(
  query?: MaintenanceQuery,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
  return useQuery({
    queryKey: maintenanceKeys.list(query),
    queryFn: () => maintenanceApi.getAll(query),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

/**
 * Fetch single maintenance request by ID
 */
export function useMaintenanceRequest(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest, Error> {
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: () => maintenanceApi.getById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

/**
 * Fetch maintenance requests by property ID
 */
export function useMaintenanceByProperty(
  propertyId: string,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
  return useQuery({
    queryKey: maintenanceKeys.byProperty(propertyId),
    queryFn: () => maintenanceApi.getByProperty(propertyId),
    enabled: Boolean(propertyId) && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

/**
 * Fetch maintenance requests by tenant ID
 */
export function useMaintenanceByTenant(
  tenantId: string,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
  return useQuery({
    queryKey: maintenanceKeys.byTenant(tenantId),
    queryFn: () => maintenanceApi.getByTenant(tenantId),
    enabled: Boolean(tenantId) && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

/**
 * Fetch maintenance statistics
 */
export function useMaintenanceStats(): UseQueryResult<MaintenanceStats, Error> {
  return useQuery({
    queryKey: maintenanceKeys.stats(),
    queryFn: maintenanceApi.getStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  })
}

/**
 * Create new maintenance request with optimistic updates
 */
export function useCreateMaintenanceRequest(): UseMutationResult<
  MaintenanceRequest,
  Error,
  CreateMaintenanceInput
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: maintenanceApi.create,
    onMutate: async (newRequest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() })
      
      // Snapshot the previous value
      const previousRequests = queryClient.getQueryData(maintenanceKeys.lists())
      
      // Optimistically update all maintenance lists
      queryClient.setQueriesData(
        { queryKey: maintenanceKeys.lists() },
        (old: MaintenanceRequest[] | undefined) => {
          if (!old) return []
          return [
            ...old,
            {
              ...newRequest,
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              assignedTo: null,
              estimatedCost: null,
              actualCost: null,
              completedAt: null
            } as MaintenanceRequest
          ]
        }
      )
      
      return { previousRequests }
    },
    onError: (err, newRequest, context) => {
      // Revert optimistic update on error
      if (context?.previousRequests) {
        queryClient.setQueriesData(
          { queryKey: maintenanceKeys.lists() },
          context.previousRequests
        )
      }
      toast.error('Failed to create maintenance request')
    },
    onSuccess: () => {
      toast.success('Maintenance request created successfully')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
    }
  })
}

/**
 * Update maintenance request with optimistic updates
 */
export function useUpdateMaintenanceRequest(): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; data: UpdateMaintenanceInput }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => maintenanceApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel queries for this request
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() })
      
      // Snapshot the previous values
      const previousRequest = queryClient.getQueryData(maintenanceKeys.detail(id))
      const previousList = queryClient.getQueryData(maintenanceKeys.lists())
      
      // Optimistically update request detail
      queryClient.setQueryData(maintenanceKeys.detail(id), (old: MaintenanceRequest | undefined) =>
        old ? { ...old, ...data, updatedAt: new Date() } : undefined
      )
      
      // Optimistically update request in lists
      queryClient.setQueriesData(
        { queryKey: maintenanceKeys.lists() },
        (old: MaintenanceRequest[] | undefined) =>
          old?.map(request => 
            request.id === id 
              ? { ...request, ...data, updatedAt: new Date() }
              : request
          )
      )
      
      return { previousRequest, previousList }
    },
    onError: (err, { id }, context) => {
      // Revert optimistic updates on error
      if (context?.previousRequest) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousRequest)
      }
      if (context?.previousList) {
        queryClient.setQueriesData({ queryKey: maintenanceKeys.lists() }, context.previousList)
      }
      toast.error('Failed to update maintenance request')
    },
    onSuccess: () => {
      toast.success('Maintenance request updated successfully')
    },
    onSettled: (data, err, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
    }
  })
}

/**
 * Delete maintenance request with optimistic updates
 */
export function useDeleteMaintenanceRequest(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: maintenanceApi.delete,
    onMutate: async (id) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() })
      
      // Snapshot previous list
      const previousList = queryClient.getQueryData(maintenanceKeys.lists())
      
      // Optimistically remove request from lists
      queryClient.setQueriesData(
        { queryKey: maintenanceKeys.lists() },
        (old: MaintenanceRequest[] | undefined) =>
          old?.filter(request => request.id !== id)
      )
      
      return { previousList }
    },
    onError: (err, id, context) => {
      // Revert optimistic update
      if (context?.previousList) {
        queryClient.setQueriesData({ queryKey: maintenanceKeys.lists() }, context.previousList)
      }
      toast.error('Failed to delete maintenance request')
    },
    onSuccess: () => {
      toast.success('Maintenance request deleted successfully')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
    }
  })
}

/**
 * Update maintenance request status
 */
export function useUpdateMaintenanceStatus(): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; status: string }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) => maintenanceApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel queries for this request
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() })
      
      // Snapshot the previous values
      const previousRequest = queryClient.getQueryData(maintenanceKeys.detail(id))
      const previousList = queryClient.getQueryData(maintenanceKeys.lists())
      
      // Optimistically update request detail
      queryClient.setQueryData(maintenanceKeys.detail(id), (old: MaintenanceRequest | undefined) =>
        old ? { ...old, status, updatedAt: new Date() } : undefined
      )
      
      // Optimistically update request in lists
      queryClient.setQueriesData(
        { queryKey: maintenanceKeys.lists() },
        (old: MaintenanceRequest[] | undefined) =>
          old?.map(request => 
            request.id === id 
              ? { ...request, status, updatedAt: new Date() }
              : request
          )
      )
      
      return { previousRequest, previousList }
    },
    onError: (err, { id }, context) => {
      // Revert optimistic updates on error
      if (context?.previousRequest) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousRequest)
      }
      if (context?.previousList) {
        queryClient.setQueriesData({ queryKey: maintenanceKeys.lists() }, context.previousList)
      }
      toast.error('Failed to update status')
    },
    onSuccess: (data, { status }) => {
      const statusMessages: Record<string, string> = {
        OPEN: 'Request opened successfully',
        IN_PROGRESS: 'Request marked as in progress',
        COMPLETED: 'Request marked as completed',
        CANCELED: 'Request cancelled',
        ON_HOLD: 'Request put on hold'
      }
      
      toast.success(statusMessages[status] || 'Request status updated')
    },
    onSettled: (data, err, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
    }
  })
}

/**
 * Assign vendor to maintenance request
 */
export function useAssignMaintenanceVendor(): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; vendorId: string }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, vendorId }) => maintenanceApi.assignVendor(id, vendorId),
    onSuccess: () => {
      toast.success('Vendor assigned successfully')
    },
    onError: () => {
      toast.error('Failed to assign vendor')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() })
    }
  })
}

/**
 * Add comment to maintenance request
 */
export function useAddMaintenanceComment(): UseMutationResult<
  { message: string },
  Error,
  { id: string; comment: string }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, comment }) => maintenanceApi.addComment(id, comment),
    onSuccess: () => {
      toast.success('Comment added successfully')
    },
    onError: () => {
      toast.error('Failed to add comment')
    },
    onSettled: (data, err, { id }) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) })
    }
  })
}

/**
 * Upload image to maintenance request
 */
export function useUploadMaintenanceImage(): UseMutationResult<
  { url: string },
  Error,
  { id: string; formData: FormData }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, formData }) => maintenanceApi.uploadImage(id, formData),
    onSuccess: () => {
      toast.success('Image uploaded successfully')
    },
    onError: () => {
      toast.error('Failed to upload image')
    },
    onSettled: (data, err, { id }) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) })
    }
  })
}