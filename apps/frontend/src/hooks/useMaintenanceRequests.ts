import { trpc } from '@/lib/utils/trpc'
import type { RouterOutputs } from '@tenantflow/shared'

type MaintenanceRequestListOutput = RouterOutputs['maintenance']['list']
type MaintenanceRequestItem = MaintenanceRequestListOutput['requests'][0]

// Main maintenance hooks using TRPC
export const useMaintenanceRequests = () => {
    return trpc.maintenance.list.useQuery({})
}

export const useMaintenanceByUnit = (unitId: string) => {
    return trpc.maintenance.list.useQuery(
        {},
        {
            select: (data: MaintenanceRequestListOutput) => data?.requests?.filter((request: MaintenanceRequestItem) => request.unitId === unitId) || []
        }
    )
}

export const useMaintenanceRequest = (id: string) => {
    return trpc.maintenance.byId.useQuery({ id })
}

export const useMaintenanceStats = () => {
    return trpc.maintenance.stats.useQuery()
}

export const useUrgentMaintenanceRequests = () => {
    return trpc.maintenance.list.useQuery(
        {},
        {
            select: (data: MaintenanceRequestListOutput) => data?.requests?.filter((request: MaintenanceRequestItem) => 
                request.priority === 'EMERGENCY' && 
                (request.status === 'OPEN' || request.status === 'IN_PROGRESS')
            ) || []
        }
    )
}

export const useCreateMaintenanceRequest = () => {
    return trpc.maintenance.add.useMutation()
}

export const useUpdateMaintenanceRequest = () => {
    return trpc.maintenance.update.useMutation()
}

export const useDeleteMaintenanceRequest = () => {
    return trpc.maintenance.delete.useMutation()
}

// Composite hook with common actions
export const useMaintenanceActions = () => {
    const list = useMaintenanceRequests()
    const create = useCreateMaintenanceRequest()
    const update = useUpdateMaintenanceRequest()
    const deleteRequest = useDeleteMaintenanceRequest()
    
    return {
        data: list.data,
        loading: list.isLoading,
        error: list.error,
        create: create.mutate,
        update: update.mutate,
        delete: deleteRequest.mutate,
        createAsync: create.mutateAsync,
        updateAsync: update.mutateAsync,
        deleteAsync: deleteRequest.mutateAsync,
        anyLoading: list.isLoading || create.isPending || update.isPending || deleteRequest.isPending
    }
}
