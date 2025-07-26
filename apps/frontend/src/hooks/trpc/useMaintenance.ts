import { useMemo } from 'react'
import { trpc } from '@/lib/clients'
import { handleApiError } from '@/lib/utils/css.utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { MaintenanceQuery } from '@/types/query-types'
import type { MaintenanceRequest } from '@tenantflow/shared'

// Type assertion to ensure TypeScript recognizes the maintenance router
// This is needed because AppRouter is currently typed as Record<string, any>
const maintenanceRouter = (trpc as any).maintenance

/**
 * Consolidated maintenance hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and analytics
 */

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

	return maintenanceRouter.list.useQuery(safeQuery, {
		retry: (failureCount: number, error: unknown) => {
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
	return maintenanceRouter.byId.useQuery(
		{ id },
		{
			enabled: !!id,
			staleTime: 5 * 60 * 1000
		}
	)
}

export function useMaintenanceStats() {
	return maintenanceRouter.stats.useQuery(undefined, {
		refetchInterval: 2 * 60 * 1000,
		staleTime: 2 * 60 * 1000
	})
}

// Specialized queries
export function useMaintenanceByUnit(unitId: string) {
	return maintenanceRouter.list.useQuery(
		{ unitId },
		{
			refetchInterval: 60000,
			enabled: !!unitId,
			staleTime: 5 * 60 * 1000
		}
	)
}

export function useOpenMaintenanceRequests() {
	return useMaintenanceRequests({ status: 'OPEN' })
}

export function useUrgentMaintenanceRequests() {
	return maintenanceRouter.list.useQuery(
		{ priority: 'EMERGENCY' },
		{
			refetchInterval: 30000,
			staleTime: 30 * 1000
		}
	)
}

export function useMaintenanceRequestsByProperty(propertyId: string) {
	return useMaintenanceRequests({ propertyId })
}

// Maintenance mutations
export function useCreateMaintenanceRequest() {
	const utils = trpc.useUtils()

	return maintenanceRouter.add.useMutation({
		onSuccess: () => {
			(utils as any).maintenance.list.invalidate()
			toast.success(toastMessages.success.created('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateMaintenanceRequest() {
	const utils = trpc.useUtils()

	return maintenanceRouter.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			(utils as any).maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			;(utils as any).maintenance.list.invalidate()
			toast.success(toastMessages.success.updated('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteMaintenanceRequest() {
	const utils = trpc.useUtils()

	return maintenanceRouter.delete.useMutation({
		onSuccess: () => {
			(utils as any).maintenance.list.invalidate()
			toast.success(toastMessages.success.deleted('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useAssignMaintenanceRequest() {
	const utils = trpc.useUtils()

	return maintenanceRouter.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			(utils as any).maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			;(utils as any).maintenance.list.invalidate()
			toast.success(toastMessages.success.updated('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useCompleteMaintenanceRequest() {
	const utils = trpc.useUtils()

	return maintenanceRouter.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			(utils as any).maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			;(utils as any).maintenance.list.invalidate()
			toast.success(toastMessages.success.updated('maintenance request'))
		},
		onError: (error: unknown) => {
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
	return maintenanceRouter.list.useQuery(
		{},
		{
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
		}
	)
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

	return maintenanceRouter.list.useQuery(safeQuery, {
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

		create: (variables: any) => createMutation.mutate(variables),
		update: (variables: any) => updateMutation.mutate(variables),
		remove: (variables: any) => deleteMutation.mutate(variables),

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