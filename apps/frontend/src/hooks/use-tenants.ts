import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useTenants(filters?: Record<string, unknown>) {
	return useQuery({
		queryKey: ['tenants', filters],
		queryFn: () => {
			const params = new URLSearchParams()
			if (filters) {
				Object.entries(filters).forEach(([key, value]) => {
					if (value) params.append(key, String(value))
				})
			}
			const query = params.toString()
			return apiClient.get(`/tenants${query ? `?${query}` : ''}`)
		},
		staleTime: 5 * 60 * 1000,
	})
}