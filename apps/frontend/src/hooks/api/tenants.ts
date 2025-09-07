'use client'

import { tenantsApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

type _Tenant = Database['public']['Tables']['Tenant']['Row']

type InsertTenant = Database['public']['Tables']['Tenant']['Insert']

type UpdateTenant = Database['public']['Tables']['Tenant']['Update']

export function useTenants(status?: string) {
	return useQuery({
		queryKey: ['tenants', status ?? 'ALL'],
		queryFn: async () => {
			return tenantsApi.list(status ? { status } : undefined)
		}
	})
}

export function useTenantStats() {
	return useQuery({
		queryKey: ['tenants', 'stats'],
		queryFn: async () => {
			return tenantsApi.stats()
		}
	})
}

export function useCreateTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertTenant) => tenantsApi.create(values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateTenant }) =>
			tenantsApi.update(id, values),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await tenantsApi.remove(id)
			return true
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
