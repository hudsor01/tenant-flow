/**
 * Lease Hooks
 * TanStack Query hooks for lease management
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@repo/shared/utils/api-client'
import type { Lease } from '@repo/shared/types/core'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for lease endpoints
 */
export const leaseKeys = {
	all: ['leases'] as const,
	list: () => [...leaseKeys.all, 'list'] as const,
	detail: (id: string) => [...leaseKeys.all, 'detail', id] as const,
	stats: () => [...leaseKeys.all, 'stats'] as const,
}

/**
 * Hook to fetch user's current lease
 */
export function useCurrentLease() {
	return useQuery({
		queryKey: leaseKeys.list(),
		queryFn: async (): Promise<Lease | null> => {
			const response = await apiClient<{
				data: Lease[]
				total: number
				limit: number
				offset: number
			}>(`${API_BASE_URL}/api/v1/leases?status=ACTIVE`)
			return response.data?.[0] || null // Return the first active lease
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

/**
 * Hook to fetch lease by ID
 */
export function useLease(id: string) {
	return useQuery({
		queryKey: leaseKeys.detail(id),
		queryFn: async (): Promise<Lease> => {
			const response = await apiClient<Lease>(`${API_BASE_URL}/api/v1/leases/${id}`)
			return response
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

/**
 * Hook to fetch lease statistics
 */
export function useLeaseStats() {
	return useQuery({
		queryKey: leaseKeys.stats(),
		queryFn: async () => {
			const response = await apiClient(`${API_BASE_URL}/api/v1/leases/stats`)
			return response
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}