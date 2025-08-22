/**
 * React Query hooks for Leases
 * Direct TanStack Query usage - no factory abstractions
 */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type {
	Lease,
	LeaseQuery,
	CreateLeaseInput,
	UpdateLeaseInput
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'

/**
 * Fetch list of leases with optional filters
 */
export function useLeases(
	query?: LeaseQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
	return useQuery({
		queryKey: ['tenantflow', 'leases', 'list', query],
		queryFn: async () => {
			const response = await apiClient.get<Lease[]>('/leases', {
				params: createQueryAdapter(query)
			})
			return response
		},
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000
	})
}

/**
 * Fetch lease statistics
 */
export function useLeaseStats(): UseQueryResult<
	{
		total: number
		active: number
		expired: number
		expiringSoon: number
		totalMonthlyRent: number
	},
	Error
> {
	return useQuery({
		queryKey: ['tenantflow', 'leases', 'stats'],
		queryFn: async () => {
			return await apiClient.get<{
				total: number
				active: number
				expired: number
				expiringSoon: number
				totalMonthlyRent: number
			}>('/leases/stats')
		},
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch single lease by ID
 */
export function useLease(
	id: string,
	options?: { enabled?: boolean }
): UseQueryResult<Lease, Error> {
	return useQuery({
		queryKey: queryKeys.leaseDetail(id),
		queryFn: async () => {
			if (!id) throw new Error('Lease ID is required')
			return await apiClient.get<Lease>(`/leases/${id}`)
		},
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000
	})
}

/**
 * Fetch leases by property ID
 */
export function useLeasesByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
	return useQuery({
		queryKey: queryKeys.leasesByProperty(propertyId),
		queryFn: async () => {
			if (!propertyId) throw new Error('Property ID is required')
			return await apiClient.get<Lease[]>(
				`/properties/${propertyId}/leases`
			)
		},
		enabled: Boolean(propertyId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000
	})
}

/**
 * Create new lease - simplified without complex optimistic updates
 */
export function useCreateLease(): UseMutationResult<
	Lease,
	Error,
	CreateLeaseInput
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: CreateLeaseInput) => {
			const response = await apiClient.post<Lease>(
				'/leases',
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases() })
			toast.success('Lease created successfully')
		},
		onError: () => {
			toast.error('Failed to create lease')
		}
	})
}

/**
 * Update lease - simplified without complex optimistic updates
 */
export function useUpdateLease(): UseMutationResult<
	Lease,
	Error,
	{ id: string; data: UpdateLeaseInput }
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, data }) => {
			const response = await apiClient.put<Lease>(
				`/leases/${id}`,
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases() })
			toast.success('Lease updated successfully')
		},
		onError: () => {
			toast.error('Failed to update lease')
		}
	})
}

/**
 * Delete lease - simplified without complex optimistic updates
 */
export function useDeleteLease(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/leases/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases() })
			toast.success('Lease deleted successfully')
		},
		onError: () => {
			toast.error('Failed to delete lease')
		}
	})
}

/**
 * Renew lease mutation
 */
export function useRenewLease(): UseMutationResult<
	Lease,
	Error,
	{ id: string; endDate: Date }
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, endDate }) => {
			const response = await apiClient.post<Lease>(
				`/leases/${id}/renew`,
				createMutationAdapter({ endDate })
			)
			return response
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases() })
			toast.success('Lease renewed successfully')
		},
		onError: () => {
			toast.error('Failed to renew lease')
		}
	})
}
