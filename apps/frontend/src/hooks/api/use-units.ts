import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Unit } from '@repo/shared'

export function useUnits(propertyId?: string) {
	return useQuery({
		queryKey: ['units', propertyId],
		queryFn: async (): Promise<Unit[]> => {
			const url = propertyId ? `/properties/${propertyId}/units` : '/units'
			return apiClient.get<Unit[]>(url)
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	})
}

export function useUnit(id: string) {
	return useQuery({
		queryKey: ['units', id],
		queryFn: async (): Promise<Unit> => {
			return apiClient.get<Unit>(`/units/${id}`)
		},
		enabled: !!id,
	})
}

export function useCreateUnit() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: Partial<Unit>) => {
			return apiClient.post<Unit>('/units', data)
		},
		onSuccess: (newUnit) => {
			queryClient.invalidateQueries({ queryKey: ['units'] })
			if (newUnit.propertyId) {
				queryClient.invalidateQueries({ queryKey: ['units', newUnit.propertyId] })
				queryClient.invalidateQueries({ queryKey: ['properties'] })
			}
		},
	})
}

export function useUpdateUnit() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, ...data }: Partial<Unit> & { id: string }) => {
			return apiClient.put<Unit>(`/units/${id}`, data)
		},
		onSuccess: (updatedUnit) => {
			queryClient.invalidateQueries({ queryKey: ['units'] })
			if (updatedUnit.id) {
				queryClient.invalidateQueries({ queryKey: ['units', updatedUnit.id] })
			}
			if (updatedUnit.propertyId) {
				queryClient.invalidateQueries({ queryKey: ['units', updatedUnit.propertyId] })
			}
		},
	})
}

export function useDeleteUnit() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (id: string) => {
			return apiClient.delete(`/units/${id}`)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['units'] })
			queryClient.invalidateQueries({ queryKey: ['properties'] })
		},
	})
}