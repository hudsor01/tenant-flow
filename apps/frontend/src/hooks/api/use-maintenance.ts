/**
 * React Query hooks for Maintenance Requests
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
  type UseQueryResult,
  type UseMutationResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { 
  MaintenanceRequest, 
  MaintenanceQuery, 
  CreateMaintenanceInput, 
  UpdateMaintenanceInput,
  RequestStatus
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { useQueryFactory,  useDetailQuery, useMutationFactory } from '../query-factory'

/**
 * Fetch list of maintenance requests with optional filters
 */
export function useMaintenanceRequests(
  query?: MaintenanceQuery,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest[], Error> {
  return useQueryFactory({
    queryKey: ['tenantflow', 'maintenance', 'list', query],
    queryFn: async () => {
      const response = await apiClient.get<MaintenanceRequest[]>('/maintenance', { 
        params: createQueryAdapter(query)
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Fetch single maintenance request by ID
 */
export function useMaintenanceRequest(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<MaintenanceRequest, Error> {
  return useDetailQuery(
    'maintenance',
    Boolean(id) && (options?.enabled ?? true) ? id : undefined,
    async (id: string) => {
      const response = await apiClient.get<MaintenanceRequest>(`/maintenance/${id}`)
      return response.data
    }
  )
}

/**
 * Create new maintenance request with optimistic updates
 */
export function useCreateMaintenanceRequest(): UseMutationResult<
  MaintenanceRequest,
  Error,
  CreateMaintenanceInput
> {
  return useMutationFactory({
    mutationFn: async (data: CreateMaintenanceInput) => {
      const response = await apiClient.post<MaintenanceRequest>('/maintenance', createMutationAdapter(data))
      return response.data
    },
    invalidateKeys: [queryKeys.maintenance()],
    successMessage: 'Maintenance request created successfully',
    errorMessage: 'Failed to create maintenance request',
    optimisticUpdate: {
      queryKey: queryKeys.maintenanceList(),
      updater: (oldData: unknown, variables: CreateMaintenanceInput) => {
        const previousRequests = oldData as MaintenanceRequest[]
        return previousRequests ? [...previousRequests, { 
          ...variables, 
          id: `temp-${Date.now()}`,
          status: 'OPEN' as RequestStatus,
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
        } as MaintenanceRequest] : []
      }
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
  return useMutationFactory({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<MaintenanceRequest>(
        `/maintenance/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [queryKeys.maintenance()],
    successMessage: 'Maintenance request updated successfully',
    errorMessage: 'Failed to update maintenance request'
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
  return useMutationFactory({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/maintenance/${id}`)
    },
    invalidateKeys: [queryKeys.maintenance()],
    successMessage: 'Maintenance request deleted successfully',
    errorMessage: 'Failed to delete maintenance request',
    optimisticUpdate: {
      queryKey: queryKeys.maintenanceList(),
      updater: (oldData: unknown, id: string) => {
        const previousList = oldData as MaintenanceRequest[]
        return previousList ? previousList.filter(r => r.id !== id) : []
      }
    }
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
  return useMutationFactory({
    mutationFn: async ({ id, status }) => {
      const response = await apiClient.patch<MaintenanceRequest>(
        `/maintenance/${id}/status`,
        { status }
      )
      return response.data
    },
    invalidateKeys: [queryKeys.maintenance()],
    errorMessage: 'Failed to update status',
    onSuccess: (data, { status }) => {
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
      import('sonner').then(({ toast }) => {
        toast.success(statusMessages[status] || 'Request status updated')
      })
    }
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
  return useMutationFactory({
    mutationFn: async ({ id, vendorId, notes }) => {
      const response = await apiClient.post<MaintenanceRequest>(
        `/maintenance/${id}/assign`,
        createMutationAdapter({ vendorId, notes })
      )
      return response.data
    },
    invalidateKeys: [queryKeys.maintenance()],
    successMessage: 'Vendor assigned successfully',
    errorMessage: 'Failed to assign vendor'
  })
}