import { useMemo } from 'react'
import { trpc } from '@/lib/clients'
import { handleApiError } from '@/lib/utils/css.utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { MaintenanceQuery } from '@/types/query-types'
import type { 
  MaintenanceRequest,
  RouterInputs
} from '@tenantflow/shared'

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
export function useMaintenanceRequests(query?: MaintenanceQuery): ReturnType<typeof trpc.maintenance.list.useQuery> {
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

	return trpc.maintenance.list.useQuery(safeQuery, {
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

export function useMaintenanceRequest(id: string): ReturnType<typeof trpc.maintenance.byId.useQuery> {
	return trpc.maintenance.byId.useQuery(
		{ id },
		{
			enabled: !!id,
			staleTime: 5 * 60 * 1000
		}
	)
}

export function useMaintenanceStats(): ReturnType<typeof trpc.maintenance.stats.useQuery> {
	return trpc.maintenance.stats.useQuery(undefined, {
		refetchInterval: 2 * 60 * 1000,
		staleTime: 2 * 60 * 1000
	})
}

// Specialized queries
export function useMaintenanceByUnit(unitId: string): ReturnType<typeof trpc.maintenance.list.useQuery> {
	return trpc.maintenance.list.useQuery(
		{ unitId },
		{
			refetchInterval: 60000,
			enabled: !!unitId,
			staleTime: 5 * 60 * 1000
		}
	)
}

export function useOpenMaintenanceRequests(): ReturnType<typeof trpc.maintenance.list.useQuery> {
	return useMaintenanceRequests({ status: 'OPEN' })
}

export function useUrgentMaintenanceRequests(): ReturnType<typeof trpc.maintenance.list.useQuery> {
	return trpc.maintenance.list.useQuery(
		{ priority: 'EMERGENCY' },
		{
			refetchInterval: 30000,
			staleTime: 30 * 1000
		}
	)
}

export function useMaintenanceRequestsByProperty(propertyId: string): ReturnType<typeof trpc.maintenance.list.useQuery> {
	return useMaintenanceRequests({ propertyId })
}

// Maintenance mutations
export function useCreateMaintenanceRequest(): ReturnType<typeof trpc.maintenance.add.useMutation> {
	const utils = trpc.useUtils()

	return trpc.maintenance.add.useMutation({
		onSuccess: () => {
			utils.maintenance.list.invalidate()
			toast.success(toastMessages.success.created('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateMaintenanceRequest(): ReturnType<typeof trpc.maintenance.update.useMutation> {
	const utils = trpc.useUtils()

	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			utils.maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			utils.maintenance.list.invalidate()
			toast.success(toastMessages.success.updated('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteMaintenanceRequest(): ReturnType<typeof trpc.maintenance.delete.useMutation> {
	const utils = trpc.useUtils()

	return trpc.maintenance.delete.useMutation({
		onSuccess: () => {
			utils.maintenance.list.invalidate()
			toast.success(toastMessages.success.deleted('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useAssignMaintenanceRequest(): ReturnType<typeof trpc.maintenance.update.useMutation> {
	const utils = trpc.useUtils()

	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			utils.maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			utils.maintenance.list.invalidate()
			toast.success(toastMessages.success.updated('maintenance request'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useCompleteMaintenanceRequest(): ReturnType<typeof trpc.maintenance.update.useMutation> {
	const utils = trpc.useUtils()

	return trpc.maintenance.update.useMutation({
		onSuccess: (updatedRequest: MaintenanceRequest) => {
			utils.maintenance.byId.setData(
				{ id: updatedRequest.id },
				updatedRequest
			)
			utils.maintenance.list.invalidate()
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
export function useMaintenanceTrends(): ReturnType<typeof trpc.maintenance.list.useQuery> {
	return trpc.maintenance.list.useQuery(
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
export function useRealtimeMaintenanceRequests(query?: MaintenanceQuery): ReturnType<typeof trpc.maintenance.list.useQuery> {
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

	return trpc.maintenance.list.useQuery(safeQuery, {
		refetchInterval: 60000,
		refetchIntervalInBackground: false
	})
}

// Combined actions helper
export function useMaintenanceActions(): {
	data: MaintenanceRequest[];
	isLoading: boolean;
	error: unknown;
	refresh: () => void;
	create: (variables: RouterInputs['maintenance']['add']) => void;
	update: (variables: RouterInputs['maintenance']['update']) => void;
	remove: (variables: RouterInputs['maintenance']['delete']) => void;
	creating: boolean;
	updating: boolean;
	deleting: boolean;
	anyLoading: boolean;
	hasUrgent: (data?: MaintenanceRequest[]) => boolean;
} {
	const maintenanceQuery = useMaintenanceRequests()
	const createMutation = useCreateMaintenanceRequest()
	const updateMutation = useUpdateMaintenanceRequest()
	const deleteMutation = useDeleteMaintenanceRequest()

	return {
		data: (maintenanceQuery.data as { requests?: MaintenanceRequest[] })?.requests || [],
		isLoading: maintenanceQuery.isLoading,
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
			const requests = data || (maintenanceQuery.data as { requests?: MaintenanceRequest[] })?.requests || []
			return requests.some(
				(r: MaintenanceRequest) => r.priority === 'HIGH' || r.priority === 'EMERGENCY'
			)
		}
	}
}
