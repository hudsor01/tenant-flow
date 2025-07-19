import { useMemo } from 'react'
import { trpc } from '../../lib/api'
import { handleApiError } from '../../lib/utils'
import { toast } from 'sonner'
import type { MaintenanceQuery } from '../../types/query-types'
import type { MaintenanceRequest } from '../../types/entities'

/**
 * Consolidated maintenance hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and analytics
 */

// Main maintenance queries
export function useMaintenanceRequests(query?: MaintenanceQuery) {
	return trpc.maintenance.list.useQuery(query || {}, {
		retry: (failureCount, error) => {
			if (error?.data?.code === 'UNAUTHORIZED') {
				return false
			}
			return failureCount < 3
		},
		refetchInterval: 60000,
		staleTime: 5 * 60 * 1000,
	})
}

export function useMaintenanceRequest(id: string) {
	return trpc.maintenance.byId.useQuery({ id }, {
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
	})
}

export function useMaintenanceStats() {
	return trpc.maintenance.stats.useQuery(undefined, {
		refetchInterval: 2 * 60 * 1000,
		staleTime: 2 * 60 * 1000,
	})
}

// Specialized queries
export function useMaintenanceByUnit(unitId: string) {
	return trpc.maintenance.list.useQuery({ unitId }, {
		refetchInterval: 60000,
		enabled: !!unitId,
		staleTime: 5 * 60 * 1000,
	})
}

export function useOpenMaintenanceRequests() {
	return useMaintenanceRequests({ status: 'OPEN' })
}

export function useUrgentMaintenanceRequests() {
	return trpc.maintenance.list.useQuery({ priority: 'URGENT,EMERGENCY' }, {
		refetchInterval: 30000,
		staleTime: 30 * 1000,
	})
}

export function useMaintenanceRequestsByProperty(propertyId: string) {
	return useMaintenanceRequests({ propertyId })
}

// Maintenance mutations
export function useCreateMaintenanceRequest() {
	const utils = trpc.useUtils()
	
	return trpc.maintenance.create.useMutation({
		onSuccess: () => {
			utils.maintenance.list.invalidate()
			toast.success('Maintenance request created successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateMaintenanceRequest() {
	const utils = trpc.useUtils()
	
	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest) => {
			utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
			utils.maintenance.list.invalidate()
			toast.success('Maintenance request updated successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteMaintenanceRequest() {
	const utils = trpc.useUtils()
	
	return trpc.maintenance.delete.useMutation({
		onSuccess: () => {
			utils.maintenance.list.invalidate()
			toast.success('Maintenance request deleted successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useAssignMaintenanceRequest() {
	const utils = trpc.useUtils()
	
	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest) => {
			utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
			utils.maintenance.list.invalidate()
			toast.success('Maintenance request assigned successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useCompleteMaintenanceRequest() {
	const utils = trpc.useUtils()
	
	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest) => {
			utils.maintenance.byId.setData({ id: updatedRequest.id }, updatedRequest)
			utils.maintenance.list.invalidate()
			toast.success('Maintenance request completed successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
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
				overdueCount: 0,
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
		const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS')
		const overduePriority = requests.filter(
			r =>
				r.status !== 'COMPLETED' &&
				(r.priority === 'URGENT' || r.priority === 'EMERGENCY')
		)

		const completed = requests.filter(
			r => r.status === 'COMPLETED' && r.completedAt
		)
		const averageCompletionTime =
			completed.length > 0
				? Math.round(
					completed.reduce((sum, request) => {
						const created = new Date(request.createdAt).getTime()
						const completedTime = new Date(request.completedAt!).getTime()
						const diffDays = (completedTime - created) / (1000 * 60 * 60 * 24)
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
				r => r.priority === 'HIGH' || r.priority === 'EMERGENCY'
			).length,
			overdueCount: overduePriority.length
		}
	}, [requests])
}

// Maintenance trends analytics
export function useMaintenanceTrends() {
	return trpc.maintenance.list.useQuery({}, {
		select: (data) => {
			const requests = data.requests || []
			const totalRequests = requests.length
			const completedRequests = requests.filter(r => r.status === 'COMPLETED').length
			return {
				totalRequests,
				completedRequests,
				openRequests: requests.filter(r => r.status === 'OPEN').length,
				inProgressRequests: requests.filter(r => r.status === 'IN_PROGRESS').length,
				completionRate: totalRequests > 0 
					? Math.round((completedRequests / totalRequests) * 100)
					: 0,
			}
		},
	})
}

// Real-time updates
export function useRealtimeMaintenanceRequests(query?: MaintenanceQuery) {
	return trpc.maintenance.list.useQuery(
		query ?? {},
		{
			refetchInterval: 60000,
			refetchIntervalInBackground: false,
		}
	)
}

// Combined actions helper
export function useMaintenanceActions() {
	const maintenanceQuery = useMaintenanceRequests()
	const createMutation = useCreateMaintenanceRequest()
	const updateMutation = useUpdateMaintenanceRequest()
	const deleteMutation = useDeleteMaintenanceRequest()

	return {
		data: maintenanceQuery.data?.requests || [],
		loading: maintenanceQuery.isLoading,
		error: maintenanceQuery.error,
		refresh: maintenanceQuery.refetch,

		create: createMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,

		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,

		anyLoading:
			maintenanceQuery.isLoading ||
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,

		hasUrgent: (data?: MaintenanceRequest[]) => {
			const requests = data || maintenanceQuery.data?.requests || []
			return requests.some(
				r => r.priority === 'HIGH' || r.priority === 'EMERGENCY'
			)
		}
	}
}