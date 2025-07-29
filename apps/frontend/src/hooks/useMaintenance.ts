import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils'
import { toastMessages } from '@/lib/toast-messages'
import type { MaintenanceQuery } from '@tenantflow/shared/types/queries'
import type { 
  CreateMaintenanceInput, 
  UpdateMaintenanceInput 
} from '@tenantflow/shared/types/api-inputs'
import type { MaintenanceRequest } from '@tenantflow/shared/types/maintenance'

// Valid maintenance status values
const VALID_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
  'ON_HOLD'
] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

// Main maintenance queries
export function useMaintenanceRequests(query?: MaintenanceQuery) {
  // Build safe query with validated status
  const safeQuery = query
    ? {
        ...query,
        limit: query.limit?.toString(),
        offset: query.offset?.toString(),
        // Validate status is one of the allowed values
        status:
          query.status &&
          VALID_STATUSES.includes(query.status as ValidStatus)
            ? (query.status as ValidStatus)
            : undefined
      }
    : {}

  return useQuery({
    queryKey: ['maintenance', 'list', safeQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(safeQuery).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      const response = await api.v1.maintenance.$get({
        query: Object.fromEntries(params)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance requests')
      }
      return response.json()
    },
    retry: (failureCount, error) => {
      const typedError = error as Error & { data?: { code?: string } }
      if (typedError?.data?.code === 'UNAUTHORIZED') {
        return false
      }
      return failureCount < 3
    },
    refetchInterval: 60000,
    staleTime: 5 * 60 * 1000
  })
}

export function useMaintenanceRequest(id: string) {
  return useQuery({
    queryKey: ['maintenance', 'byId', id],
    queryFn: async () => {
      const response = await api.v1.maintenance[':id'].$get({
        param: { id }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance request')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })
}

export function useMaintenanceStats() {
  return useQuery({
    queryKey: ['maintenance', 'stats'],
    queryFn: async () => {
      const response = await api.v1.maintenance.stats.$get()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance stats')
      }
      return response.json()
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  })
}

// Specialized queries
export function useMaintenanceByUnit(unitId: string) {
  return useQuery({
    queryKey: ['maintenance', 'byUnit', unitId],
    queryFn: async () => {
      const response = await api.v1.maintenance.$get({
        query: { unitId }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance requests')
      }
      return response.json()
    },
    refetchInterval: 60000,
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000
  })
}

export function useOpenMaintenanceRequests() {
  return useMaintenanceRequests({ status: 'OPEN' })
}

export function useUrgentMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance', 'urgent'],
    queryFn: async () => {
      const response = await api.v1.maintenance.$get({
        query: { priority: 'EMERGENCY' }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch urgent maintenance requests')
      }
      return response.json()
    },
    refetchInterval: 30000,
    staleTime: 30 * 1000
  })
}

export function useMaintenanceRequestsByProperty(propertyId: string) {
  return useMaintenanceRequests({ propertyId })
}

// Maintenance mutations
export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateMaintenanceInput) => {
      const response = await api.v1.maintenance.$post({
        json: input as unknown as Record<string, unknown>
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create maintenance request')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'list'] })
      toast.success(toastMessages.success.created('maintenance request'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMaintenanceInput) => {
      const { id, ...updateData } = input
      if (!id) throw new Error('Maintenance request ID is required')
      const response = await api.v1.maintenance[':id'].$put({
        param: { id },
        json: updateData as unknown as Record<string, unknown>
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update maintenance request')
      }
      return response.json()
    },
    onSuccess: (updatedRequest: MaintenanceRequest) => {
      queryClient.setQueryData(['maintenance', 'byId', updatedRequest.id], updatedRequest)
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'list'] })
      toast.success(toastMessages.success.updated('maintenance request'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useDeleteMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.v1.maintenance[':id'].$delete({
        param: { id: variables.id }
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete maintenance request')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'list'] })
      toast.success(toastMessages.success.deleted('maintenance request'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useAssignMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMaintenanceInput) => {
      const { id, ...updateData } = input
      if (!id) throw new Error('Maintenance request ID is required')
      const response = await api.v1.maintenance[':id'].$put({
        param: { id },
        json: updateData as unknown as Record<string, unknown>
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign maintenance request')
      }
      return response.json()
    },
    onSuccess: (updatedRequest: MaintenanceRequest) => {
      queryClient.setQueryData(['maintenance', 'byId', updatedRequest.id], updatedRequest)
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'list'] })
      toast.success(toastMessages.success.updated('maintenance request'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export function useCompleteMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMaintenanceInput) => {
      const { id, ...updateData } = input
      if (!id) throw new Error('Maintenance request ID is required')
      const response = await api.v1.maintenance[':id'].$put({
        param: { id },
        json: { ...updateData, status: 'COMPLETED' } as unknown as Record<string, unknown>
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to complete maintenance request')
      }
      return response.json()
    },
    onSuccess: (updatedRequest: MaintenanceRequest) => {
      queryClient.setQueryData(['maintenance', 'byId', updatedRequest.id], updatedRequest)
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'list'] })
      toast.success(toastMessages.success.updated('maintenance request'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Enhanced maintenance analysis
export function useMaintenanceAnalysis(requests?: MaintenanceRequest[]) {
  return useMemo(() => {
    if (!requests?.length) {
      return {
        totalRequests: 0,
        byStatus: {},
        byPriority: {},
        openRequests: [],
        inProgressRequests: [],
        overduePriority: [],
        averageCompletionTime: 0,
        recentRequests: [],
        completionRate: 0,
        urgentCount: 0,
        overdueCount: 0
      }
    }

    const byStatus = requests.reduce(
      (acc, request) => {
        acc[request.status] = (acc[request.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const byPriority = requests.reduce(
      (acc, request) => {
        acc[request.priority] = (acc[request.priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const openRequests = requests.filter(r => r.status === 'OPEN')
    const inProgressRequests = requests.filter(
      r => r.status === 'IN_PROGRESS'
    )
    const overduePriority = requests.filter(
      r =>
        r.status !== 'COMPLETED' &&
        (r.priority === 'HIGH' || r.priority === 'EMERGENCY')
    )

    const completed = requests.filter(
      r => r.status === 'COMPLETED' && r.completedAt
    )
    const averageCompletionTime =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, request) => {
              const created = new Date(
                request.createdAt
              ).getTime()
              const completedTime = new Date(
                request.completedAt!
              ).getTime()
              const diffDays =
                (completedTime - created) /
                (1000 * 60 * 60 * 24)
              return sum + diffDays
            }, 0) / completed.length
          )
        : 0

    const recentRequests = [...requests]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 10)

    return {
      totalRequests: requests.length,
      byStatus,
      byPriority,
      openRequests,
      inProgressRequests,
      overduePriority,
      averageCompletionTime,
      recentRequests,
      completionRate:
        requests.length > 0
          ? (completed.length / requests.length) * 100
          : 0,
      urgentCount: requests.filter(
        (r: MaintenanceRequest) => r.priority === 'HIGH' || r.priority === 'EMERGENCY'
      ).length,
      overdueCount: overduePriority.length
    }
  }, [requests])
}

// Maintenance trends analytics
export function useMaintenanceTrends() {
  return useQuery({
    queryKey: ['maintenance', 'trends'],
    queryFn: async () => {
      const response = await api.v1.maintenance.$get()
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance trends')
      }
      return response.json()
    },
    select: (data: { requests: MaintenanceRequest[]; total: number; totalCost: number }) => {
      const requests = data.requests || []
      const totalRequests = requests.length
      const completedRequests = requests.filter(
        (r: MaintenanceRequest) => r.status === 'COMPLETED'
      ).length
      return {
        totalRequests,
        completedRequests,
        openRequests: requests.filter((r: MaintenanceRequest) => r.status === 'OPEN')
          .length,
        inProgressRequests: requests.filter(
          (r: MaintenanceRequest) => r.status === 'IN_PROGRESS'
        ).length,
        completionRate:
          totalRequests > 0
            ? Math.round(
                (completedRequests / totalRequests) * 100
              )
            : 0
      }
    }
  })
}

// Real-time updates
export function useRealtimeMaintenanceRequests(query?: MaintenanceQuery) {
  // Build safe query with validated status
  const safeQuery = query
    ? {
        ...query,
        limit: query.limit?.toString(),
        offset: query.offset?.toString(),
        // Validate status is one of the allowed values
        status:
          query.status &&
          VALID_STATUSES.includes(query.status as ValidStatus)
            ? (query.status as ValidStatus)
            : undefined
      }
    : {}

  return useQuery({
    queryKey: ['maintenance', 'realtime', safeQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(safeQuery).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      const response = await api.v1.maintenance.$get({
        query: Object.fromEntries(params)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch maintenance requests')
      }
      return response.json()
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false
  })
}

// Combined actions helper
export function useMaintenanceActions() {
  const maintenanceQuery = useMaintenanceRequests()
  const createMutation = useCreateMaintenanceRequest()
  const updateMutation = useUpdateMaintenanceRequest()
  const deleteMutation = useDeleteMaintenanceRequest()

  return {
    data: (maintenanceQuery.data as { requests?: MaintenanceRequest[] })?.requests || [],
    isLoading: maintenanceQuery.isLoading,
    error: maintenanceQuery.error,
    refresh: () => maintenanceQuery.refetch(),

    create: (variables: CreateMaintenanceInput) => createMutation.mutate(variables),
    update: (variables: UpdateMaintenanceInput) => updateMutation.mutate(variables),
    remove: (variables: { id: string }) => deleteMutation.mutate(variables),

    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    anyLoading:
      maintenanceQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,

    hasUrgent: (data?: MaintenanceRequest[]) => {
      const requests = data || (maintenanceQuery.data as { requests?: MaintenanceRequest[] })?.requests || []
      return requests.some(
        (r: MaintenanceRequest) => r.priority === 'HIGH' || r.priority === 'EMERGENCY'
      )
    }
  }
}