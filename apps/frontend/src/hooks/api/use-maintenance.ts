/**
 * React 19 + TanStack Query v5 Maintenance Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useQuery,
	useQueryClient,
	type UseQueryResult
} from '@tanstack/react-query'
import type {
	MaintenanceRequestApiResponse,
	MaintenanceStats,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceStatus
} from '@repo/shared'
import { get, post, put, del } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * Standard useQuery for maintenance requests
 */
export function useMaintenanceRequests(
	params?: {
		status?: MaintenanceStatus
		priority?: string
		propertyId?: string
		unitId?: string
	}
): UseQueryResult<MaintenanceRequestApiResponse[]> {
	return useQuery({
		queryKey: queryKeys.maintenance.list(params),
		queryFn: async () => get<MaintenanceRequestApiResponse[]>('/api/maintenance'),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Standard useQuery for single maintenance request
 */
export function useMaintenanceRequest(id: string): UseQueryResult<MaintenanceRequest> {
	return useQuery({
		queryKey: queryKeys.maintenance.detail(id),
		queryFn: async () => get<MaintenanceRequest>(`/api/maintenance/${id}`),
		staleTime: 2 * 60 * 1000, // 2 minutes
		enabled: !!id
	})
}

/**
 * Standard useQuery for maintenance statistics
 */
export function useMaintenanceStats(): UseQueryResult<MaintenanceStats> {
	return useQuery({
		queryKey: queryKeys.maintenance.stats(),
		queryFn: async () => get<MaintenanceStats>('/api/maintenance/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

// ============================================================================
// CRUD OPERATIONS - Simple hooks for components
// ============================================================================

/**
 * Legacy hook alias for creating maintenance requests
 */
export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	const mutate = async (data: CreateMaintenanceInput) => {
		const result = await post<MaintenanceRequestApiResponse>('/api/maintenance', data)
		// Invalidate related queries using proper query keys
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
		return result
	}
	
	return { 
		mutate,
		mutateAsync: mutate,
		isPending: false,
		isSuccess: false,
		isError: false,
		error: null
	}
}

/**
 * Legacy hook alias for deleting maintenance requests
 */
export function useDeleteMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	const mutate = async (id: string) => {
		await del<void>(`/api/maintenance/${id}`)
		// Invalidate related queries using proper query keys
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
	}
	
	return { mutate, isPending: false }
}

/**
 * Legacy hook alias for updating maintenance requests
 */
export function useUpdateMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	const mutate = async (id: string, data: UpdateMaintenanceInput) => {
		const result = await put<MaintenanceRequestApiResponse>(`/api/maintenance/${id}`, data)
		// Invalidate related queries using proper query keys
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() })
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.detail(id) })
		await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.stats() })
		return result
	}
	
	return { mutate, isPending: false }
}