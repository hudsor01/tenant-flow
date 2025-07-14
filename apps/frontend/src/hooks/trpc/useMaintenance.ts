import { trpc } from '@/lib/trpcClient'
import type {
  CreateMaintenanceSchema,
  UpdateMaintenanceSchema,
  MaintenanceQuerySchema,
  AssignMaintenanceSchema,
  CompleteMaintenanceSchema
} from '@/types/maintenance'

// Maintenance queries
export function useMaintenanceRequests(query?: MaintenanceQuerySchema) {
  return trpc.maintenance.list.useQuery(query || {})
}

export function useMaintenanceRequest(id: string) {
  return trpc.maintenance.byId.useQuery({ id })
}

export function useMaintenanceStats() {
  return trpc.maintenance.stats.useQuery()
}

// Maintenance mutations
export function useCreateMaintenanceRequest() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.create.useMutation({
    onSuccess: () => {
      utils.maintenance.list.invalidate()
      utils.maintenance.stats.invalidate()
    },
  })
}

export function useUpdateMaintenanceRequest() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.update.useMutation({
    onSuccess: (updatedRequest) => {
      utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
      utils.maintenance.list.invalidate()
      utils.maintenance.stats.invalidate()
    },
  })
}

export function useDeleteMaintenanceRequest() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.delete.useMutation({
    onSuccess: () => {
      utils.maintenance.list.invalidate()
      utils.maintenance.stats.invalidate()
    },
  })
}

export function useAssignMaintenanceRequest() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.assign.useMutation({
    onSuccess: (updatedRequest) => {
      utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
      utils.maintenance.list.invalidate()
      utils.maintenance.stats.invalidate()
    },
  })
}

export function useCompleteMaintenanceRequest() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.complete.useMutation({
    onSuccess: (updatedRequest) => {
      utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
      utils.maintenance.list.invalidate()
      utils.maintenance.stats.invalidate()
    },
  })
}

export function useCreateWorkOrder() {
  const utils = trpc.useUtils()
  
  return trpc.maintenance.createWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.list.invalidate()
    },
  })
}

// Specialized maintenance queries
export function useOpenMaintenanceRequests() {
  return useMaintenanceRequests({ status: 'OPEN' })
}

export function useUrgentMaintenanceRequests() {
  return useMaintenanceRequests({ priority: 'URGENT' })
}

export function useMaintenanceRequestsByProperty(propertyId: string) {
  return useMaintenanceRequests({ propertyId })
}

export function useMaintenanceRequestsByUnit(unitId: string) {
  return useMaintenanceRequests({ unitId })
}

// Maintenance analytics
export function useMaintenanceTrends() {
  return trpc.maintenance.stats.useQuery(undefined, {
    select: (data) => ({
      ...data,
      completionRate: data.totalRequests > 0 
        ? Math.round((data.completedRequests / data.totalRequests) * 100)
        : 0,
      avgCostPerRequest: data.totalRequests > 0
        ? Math.round(data.totalActualCost / data.totalRequests)
        : 0,
    }),
  })
}

// Real-time updates for maintenance
export function useRealtimeMaintenanceRequests(query?: MaintenanceQuerySchema) {
  return trpc.maintenance.list.useQuery(
    query || {},
    {
      refetchInterval: 60000, // 1 minute for maintenance updates
      refetchIntervalInBackground: false,
    }
  )
}