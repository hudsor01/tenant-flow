import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { DashboardStats } from '@repo/shared'

export function useDashboardStats(_p0?: { enabled: boolean; refetchInterval: number }) {
	return useQuery({
		queryKey: ['dashboard', 'stats'],
		queryFn: async (): Promise<DashboardStats> => {
			return apiClient.get<DashboardStats>('/dashboard/stats')
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	})
}

export function useDashboardActivity(_p0?: number, _p1?: { enabled: boolean }) {
	return useQuery({
		queryKey: ['dashboard', 'activity'],
		queryFn: async () => {
			return apiClient.get('/dashboard/activity')
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
	})
}