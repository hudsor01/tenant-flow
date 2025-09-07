'use client'

import { propertiesApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

type _Property = Database['public']['Tables']['Property']['Row']
type InsertProperty = Database['public']['Tables']['Property']['Insert']
type UpdateProperty = Database['public']['Tables']['Property']['Update']

type PropertyStatus = Database['public']['Enums']['PropertyStatus']

export function useProperties(status?: PropertyStatus) {
	return useQuery({
		queryKey: ['properties', status ?? 'ALL'],
		queryFn: async () => propertiesApi.list(status ? { status } : undefined)
	})
}

export function useCreateProperty() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertProperty) => propertiesApi.create(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['properties'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateProperty() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({
			id,
			values
		}: {
			id: string
			values: UpdateProperty
		}) => propertiesApi.update(id, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['properties'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteProperty() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await propertiesApi.remove(id)
			return true
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['properties'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
