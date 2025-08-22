import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useLeases(filters?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['leases', filters],
		queryFn: () => {
			const params = new URLSearchParams()
			if (filters) {
				Object.entries(filters).forEach(([key, value]) => {
					if (value) params.append(key, String(value))
				})
			}
			const query = params.toString()
			return apiClient.get(`/leases${query ? `?${query}` : ''}`)
		},
		staleTime: 5 * 60 * 1000,
	})
}

export function useCreateLease() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => apiClient.post('/leases', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['leases'] })
		},
	})
}