import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { MaintenanceRequest } from '@repo/shared'

export function useMaintenanceRequests(filters?: {
	status?: string
	priority?: string
	propertyId?: string
}) {
	return useQuery({
		queryKey: ['maintenance-requests', filters],
		queryFn: async (): Promise<MaintenanceRequest[]> => {
			const params = new URLSearchParams()
			if (filters?.status) params.append('status', filters.status)
			if (filters?.priority) params.append('priority', filters.priority)
			if (filters?.propertyId) params.append('propertyId', filters.propertyId)
			
			const query = params.toString()
			return apiClient.get<MaintenanceRequest[]>(`/maintenance-requests${query ? `?${query}` : ''}`)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	})
}

export function useMaintenanceRequest(id: string) {
	return useQuery({
		queryKey: ['maintenance-requests', id],
		queryFn: async (): Promise<MaintenanceRequest> => {
			return apiClient.get<MaintenanceRequest>(`/maintenance-requests/${id}`)
		},
		enabled: !!id,
	})
}

export function useUpdateMaintenanceStatus() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, status }: { id: string; status: string }) => {
			return apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${id}`, { status })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
		},
	})
}

export function useCreateMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: Partial<MaintenanceRequest>) => {
			return apiClient.post<MaintenanceRequest>('/maintenance-requests', data)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
		},
	})
}

export function useDeleteMaintenanceRequest() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (id: string) => {
			return apiClient.delete(`/maintenance-requests/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
		},
	})
}

export interface MaintenanceStats {
	total: number
	open: number
	assigned: number
	inProgress: number
	completed: number
	cancelled: number
	overdue: number
	averageCompletionTime: number
	totalCost: number
	averageCost: number
}

export function useMaintenanceStats() {
	return useQuery({
		queryKey: ['maintenance-stats'],
		queryFn: async (): Promise<MaintenanceStats> => {
			return apiClient.get<MaintenanceStats>('/maintenance-requests/stats')
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	})
}