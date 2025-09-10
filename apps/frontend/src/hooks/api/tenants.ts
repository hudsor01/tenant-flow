'use client'

import { tenantsApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import type { TenantStats } from '@repo/shared'
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
		onMutate: async newTenant => {
			// Cancel outgoing refetches to prevent optimistic update conflicts
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous value for rollback
			const previousTenants = qc.getQueryData(['tenants', 'ALL'])

			// Optimistically update cache with new tenant
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				const optimisticTenant: _Tenant = {
					id: `temp-${Date.now()}`, // Temporary ID until server response
					...newTenant,
					avatarUrl: newTenant.avatarUrl || null,
					phone: newTenant.phone || null,
					emergencyContact: newTenant.emergencyContact || null,
					userId: newTenant.userId || null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				return old ? [...old, optimisticTenant] : [optimisticTenant]
			})

			// Update stats optimistically
			qc.setQueriesData(
				{ queryKey: ['tenants', 'stats'] },
				(old: TenantStats | undefined) => {
					if (old) {
						return {
							...old,
							total: (old.total || 0) + 1,
							active: (old.active || 0) + 1
						}
					}
					return old
				}
			)

			// Return context for rollback
			return { previousTenants }
		},
		onError: (_err, _newTenant, context) => {
			// Rollback optimistic updates on error
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			// Also refresh stats to ensure consistency
			qc.invalidateQueries({ queryKey: ['tenants', 'stats'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all tenant queries to get server data
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
		onMutate: async ({ id, values }) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous value
			const previousTenants = qc.getQueryData(['tenants', 'ALL'])
			const previousStats = qc.getQueryData(['tenants', 'stats'])

			// Optimistically update tenant in cache
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				if (!old) return old
				return old.map(tenant =>
					tenant.id === id
						? { ...tenant, ...values, updatedAt: new Date().toISOString() }
						: tenant
				)
			})

			return { previousTenants, previousStats }
		},
		onError: (_err, _variables, context) => {
			// Rollback optimistic updates
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			if (context?.previousStats) {
				qc.setQueryData(['tenants', 'stats'], context.previousStats)
			}
		},
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
		onMutate: async id => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous values
			const previousTenants = qc.getQueryData(['tenants', 'ALL']) as
				| _Tenant[]
				| undefined
			const previousStats = qc.getQueryData(['tenants', 'stats'])

			// Find the tenant being deleted for stats update
			const tenantToDelete = previousTenants?.find(t => t.id === id)

			// Optimistically remove tenant from cache
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				if (!old) return old
				return old.filter(tenant => tenant.id !== id)
			})

			// Update stats optimistically
			if (tenantToDelete) {
				qc.setQueriesData(
					{ queryKey: ['tenants', 'stats'] },
					(old: TenantStats | undefined) => {
						if (!old) return old

						return {
							...old,
							total: Math.max(0, (old.total || 0) - 1),
							active: Math.max(0, (old.active || 0) - 1)
						}
					}
				)
			}

			return { previousTenants, previousStats, deletedTenant: tenantToDelete }
		},
		onError: (_err, _id, context) => {
			// Rollback optimistic updates
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			if (context?.previousStats) {
				qc.setQueryData(['tenants', 'stats'], context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
