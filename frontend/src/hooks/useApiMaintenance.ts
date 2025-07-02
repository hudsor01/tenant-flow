import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  MaintenanceWithDetails,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceQuery,
} from '../types/api'
import { toast } from 'sonner'

// Maintenance requests list hook
export function useMaintenanceRequests(query?: MaintenanceQuery) {
  return useQuery({
    queryKey: queryKeys.maintenance.list(query ? { ...query } : {}),
    queryFn: () => apiClient.maintenance.getAll(query as Record<string, unknown> | undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Maintenance requests by unit hook
export function useMaintenanceByUnit(unitId: string) {
  return useQuery({
    queryKey: queryKeys.maintenance.list({ unitId }),
    queryFn: () => apiClient.maintenance.getAll({ unitId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!unitId && apiClient.auth.isAuthenticated(),
  })
}

// Single maintenance request hook
export function useMaintenanceRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.maintenance.detail(id),
    queryFn: () => apiClient.maintenance.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Maintenance statistics hook
export function useMaintenanceStats() {
  return useQuery({
    queryKey: queryKeys.maintenance.stats(),
    queryFn: () => apiClient.maintenance.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Create maintenance request mutation
export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMaintenanceDto) => apiClient.maintenance.create(data),
    onSuccess: (newRequest: MaintenanceWithDetails) => {
      // Invalidate and refetch maintenance lists
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
      
      // Also invalidate unit-specific queries
      if (newRequest.unitId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.maintenance.list({ unitId: newRequest.unitId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.detail(newRequest.unitId)
        })
      }
      
      // Add the new request to cache
      queryClient.setQueryData(
        queryKeys.maintenance.detail(newRequest.id),
        newRequest
      )
      
      toast.success('Maintenance request created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update maintenance request mutation
export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaintenanceDto }) =>
      apiClient.maintenance.update(id, data),
    onSuccess: (updatedRequest: MaintenanceWithDetails) => {
      // Update the request in cache
      queryClient.setQueryData(
        queryKeys.maintenance.detail(updatedRequest.id),
        updatedRequest
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
      
      // Invalidate unit-specific data
      if (updatedRequest.unitId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.maintenance.list({ unitId: updatedRequest.unitId })
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.detail(updatedRequest.unitId)
        })
      }
      
      toast.success('Maintenance request updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete maintenance request mutation
export function useDeleteMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.maintenance.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove request from cache
      queryClient.removeQueries({ queryKey: queryKeys.maintenance.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      
      toast.success('Maintenance request deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for maintenance management
export function useMaintenanceActions() {
  const createRequest = useCreateMaintenanceRequest()
  const updateRequest = useUpdateMaintenanceRequest()
  const deleteRequest = useDeleteMaintenanceRequest()

  return {
    create: createRequest,
    update: updateRequest,
    delete: deleteRequest,
    isLoading:
      createRequest.isPending ||
      updateRequest.isPending ||
      deleteRequest.isPending,
  }
}

// Hook for maintenance request analysis
export function useMaintenanceAnalysis(requests?: MaintenanceWithDetails[]) {
  return {
    totalRequests: requests?.length || 0,
    
    byStatus: requests?.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
    
    byPriority: requests?.reduce((acc, request) => {
      acc[request.priority] = (acc[request.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {},
    
    openRequests: requests?.filter(r => r.status === 'OPEN') || [],
    
    inProgressRequests: requests?.filter(r => r.status === 'IN_PROGRESS') || [],
    
    overduePriority: requests?.filter(r => 
      r.status !== 'COMPLETED' && 
      (r.priority === 'URGENT' || r.priority === 'EMERGENCY')
    ) || [],
    
    averageCompletionTime: (() => {
      const completed = requests?.filter(r => r.status === 'COMPLETED' && r.completedAt) || []
      if (completed.length === 0) return 0
      
      const totalDays = completed.reduce((sum, request) => {
        const created = new Date(request.createdAt)
        const completed = new Date(request.completedAt!)
        const diffDays = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return sum + diffDays
      }, 0)
      
      return Math.round(totalDays / completed.length)
    })(),
    
    recentRequests: requests
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ?.slice(0, 10) || [],
  }
}