/**
 * React Query hooks for Maintenance Requests
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
  MaintenanceRequest, 
  MaintenanceQuery, 
  CreateMaintenanceInput, 
  UpdateMaintenanceInput,
  RequestStatus
} from '@repo/shared'
import { toast } from 'sonner'

/**
 * Fetch list of maintenance requests with optional filters
 */
export function useMaintenanceRequests(
  query?: MaintenanceQuery,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
  return useQuery({
    queryKey: queryKeys.maintenanceList(query),
    queryFn: async () => {
      const response = await apiClient.get<MaintenanceRequest[]>('/maintenance', { 
        params: query 
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
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
    queryKey: queryKeys.maintenanceDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<MaintenanceRequest>(`/maintenance/${id}`)
      return response.data
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
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
    mutationKey: mutationKeys.createMaintenanceRequest,
    mutationFn: async (data: CreateMaintenanceInput) => {
      const response = await apiClient.post<MaintenanceRequest>('/maintenance', data)
      return response.data
    },
    onMutate: async (newRequest) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.maintenance() 
      })

      const previousRequests = queryClient.getQueryData<MaintenanceRequest[]>(
        queryKeys.maintenanceList()
      )

      if (previousRequests) {
        queryClient.setQueryData<MaintenanceRequest[]>(
          queryKeys.maintenanceList(),
          [...previousRequests, { 
            ...newRequest, 
            id: `temp-${Date.now()}`,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedTo: null,
            estimatedCost: null,
            actualCost: null,
            completedAt: null,
            requestedBy: null,
            notes: null,
            photos: [],
            allowEntry: false,
            contactPhone: null,
            preferredDate: null
          } as MaintenanceRequest]
        )
      }

      return { previousRequests }
    },
    onError: (err, _, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(
          queryKeys.maintenanceList(),
          context.previousRequests
        )
      }
      toast.error('Failed to create maintenance request')
    },
    onSuccess: () => {
      toast.success('Maintenance request created successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenance() 
      })
    },
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
    mutationKey: mutationKeys.updateMaintenanceRequest,
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<MaintenanceRequest>(
        `/maintenance/${id}`,
        data
      )
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.maintenanceDetail(id) 
      })

      const previousRequest = queryClient.getQueryData<MaintenanceRequest>(
        queryKeys.maintenanceDetail(id)
      )

      if (previousRequest) {
        queryClient.setQueryData<MaintenanceRequest>(
          queryKeys.maintenanceDetail(id),
          { ...previousRequest, ...data } as MaintenanceRequest
        )
      }

      const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
        queryKeys.maintenanceList()
      )
      if (previousList) {
        queryClient.setQueryData<MaintenanceRequest[]>(
          queryKeys.maintenanceList(),
          previousList.map(r => 
            r.id === id ? { ...r, ...data } as MaintenanceRequest : r
          )
        )
      }

      return { previousRequest, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousRequest) {
        queryClient.setQueryData(
          queryKeys.maintenanceDetail(id),
          context.previousRequest
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.maintenanceList(),
          context.previousList
        )
      }
      toast.error('Failed to update maintenance request')
    },
    onSuccess: (data, { id }) => {
      toast.success('Maintenance request updated successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceList() 
      })
    },
  })
}

/**
 * Delete maintenance request with optimistic updates
 */
export function useDeleteMaintenanceRequest(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.deleteMaintenanceRequest,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/maintenance/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.maintenance() 
      })

      const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
        queryKeys.maintenanceList()
      )

      if (previousList) {
        queryClient.setQueryData<MaintenanceRequest[]>(
          queryKeys.maintenanceList(),
          previousList.filter(r => r.id !== id)
        )
      }

      return { previousList }
    },
    onError: (err, _, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.maintenanceList(),
          context.previousList
        )
      }
      toast.error('Failed to delete maintenance request')
    },
    onSuccess: () => {
      toast.success('Maintenance request deleted successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenance() 
      })
    },
  })
}

/**
 * Update maintenance request status
 */
export function useUpdateMaintenanceStatus(): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; status: RequestStatus }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await apiClient.patch<MaintenanceRequest>(
        `/maintenance/${id}/status`,
        { status }
      )
      return response.data
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.maintenanceDetail(id) 
      })

      const previousRequest = queryClient.getQueryData<MaintenanceRequest>(
        queryKeys.maintenanceDetail(id)
      )

      if (previousRequest) {
        queryClient.setQueryData<MaintenanceRequest>(
          queryKeys.maintenanceDetail(id),
          { ...previousRequest, status } as MaintenanceRequest
        )
      }

      const previousList = queryClient.getQueryData<MaintenanceRequest[]>(
        queryKeys.maintenanceList()
      )
      if (previousList) {
        queryClient.setQueryData<MaintenanceRequest[]>(
          queryKeys.maintenanceList(),
          previousList.map(r => 
            r.id === id ? { ...r, status } as MaintenanceRequest : r
          )
        )
      }

      return { previousRequest, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousRequest) {
        queryClient.setQueryData(
          queryKeys.maintenanceDetail(id),
          context.previousRequest
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.maintenanceList(),
          context.previousList
        )
      }
      toast.error('Failed to update status')
    },
    onSuccess: (data, { id, status }) => {
      const statusMessages: Record<string, string> = {
        OPEN: 'Request opened successfully',
        IN_PROGRESS: 'Request marked as in progress', 
        COMPLETED: 'Request marked as completed',
        CANCELED: 'Request cancelled',
        ON_HOLD: 'Request put on hold',
        pending: 'Request marked as pending',
        in_progress: 'Request marked as in progress',
        completed: 'Request marked as completed',
        cancelled: 'Request cancelled'
      }
      toast.success(statusMessages[status] || 'Request status updated')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceList() 
      })
    },
  })
}

/**
 * Assign maintenance request to vendor
 */
export function useAssignMaintenanceVendor(): UseMutationResult<
  MaintenanceRequest,
  Error,
  { id: string; vendorId: string; notes?: string }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, vendorId, notes }) => {
      const response = await apiClient.post<MaintenanceRequest>(
        `/maintenance/${id}/assign`,
        { vendorId, notes }
      )
      return response.data
    },
    onSuccess: (data, { id }) => {
      toast.success('Vendor assigned successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.maintenanceList() 
      })
    },
    onError: () => {
      toast.error('Failed to assign vendor')
    },
  })
}