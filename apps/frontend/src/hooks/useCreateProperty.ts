import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useCreateProperty() {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => apiClient.post('/properties', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['properties'] })
		},
	})
}