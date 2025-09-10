'use client'

import { leasesApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

// Lease type now imported from @repo/shared types - removed unused local definition

type _Lease = Database['public']['Tables']['Lease']['Row']
type InsertLease = Database['public']['Tables']['Lease']['Insert']
type UpdateLease = Database['public']['Tables']['Lease']['Update']

type LeaseStatus = Database['public']['Enums']['LeaseStatus']

export function useLeases(status?: LeaseStatus) {
	return useQuery({
		queryKey: ['leases', status ?? 'ALL'],
		queryFn: async () => {
			return leasesApi.list(status ? { status } : undefined)
		}
	})
}

export function useLeaseStats() {
	return useQuery({
		queryKey: ['leases', 'stats'],
		queryFn: async () => {
			return leasesApi.stats()
		}
	})
}

export function useCreateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertLease) => leasesApi.create(values),
		onMutate: async (newLease) => {
			// Cancel outgoing refetches to prevent optimistic update conflicts
			await qc.cancelQueries({ queryKey: ['leases'] })

			// Snapshot previous value for rollback
			const previousLeases = qc.getQueryData(['leases', 'ALL'])

			// Optimistically update cache with new lease
			qc.setQueryData(['leases', 'ALL'], (old: _Lease[] | undefined) => {
				const optimisticLease: _Lease = {
					id: `temp-${Date.now()}`, // Temporary ID until server response
					...newLease,
					status: newLease.status || 'ACTIVE',
					terms: newLease.terms || null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				return old ? [...old, optimisticLease] : [optimisticLease]
			})

			// Update stats optimistically
			qc.setQueriesData({ queryKey: ['leases', 'stats'] }, (old: { totalLeases?: number, activeLeases?: number, totalMonthlyRent?: number } | undefined) => {
				if (old) {
					return {
						...old,
						totalLeases: (old.totalLeases || 0) + 1,
						activeLeases: newLease.status === 'ACTIVE' ? (old.activeLeases || 0) + 1 : old.activeLeases,
						totalMonthlyRent: (old.totalMonthlyRent || 0) + (newLease.rentAmount || 0)
					}
				}
				return old
			})

			// Return context for rollback
			return { previousLeases }
		},
		onError: (_err, _newLease, context) => {
			// Rollback optimistic updates on error
			if (context?.previousLeases) {
				qc.setQueryData(['leases', 'ALL'], context.previousLeases)
			}
			// Also refresh stats to ensure consistency
			qc.invalidateQueries({ queryKey: ['leases', 'stats'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all lease queries to get server data
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateLease }) =>
			leasesApi.update(id, values),
		onMutate: async ({ id, values }) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['leases'] })

			// Snapshot previous value
			const previousLeases = qc.getQueryData(['leases', 'ALL'])
			const previousStats = qc.getQueryData(['leases', 'stats'])

			// Optimistically update lease in cache
			qc.setQueryData(['leases', 'ALL'], (old: _Lease[] | undefined) => {
				if (!old) return old
				return old.map(lease => 
					lease.id === id 
						? { ...lease, ...values, updatedAt: new Date().toISOString() }
						: lease
				)
			})

			// Update stats if status or rent changed
			if (values.status || values.rentAmount) {
				const oldLease = (previousLeases as _Lease[])?.find(l => l.id === id)
				if (oldLease) {
					qc.setQueriesData({ queryKey: ['leases', 'stats'] }, (old: { totalLeases?: number, activeLeases?: number, totalMonthlyRent?: number } | undefined) => {
						if (!old) return old
						
						const newStats = { ...old }
						
						// Handle status change
						if (values.status && oldLease.status !== values.status) {
							if (oldLease.status === 'ACTIVE') {
								newStats.activeLeases = Math.max(0, (newStats.activeLeases || 0) - 1)
							}
							if (values.status === 'ACTIVE') {
								newStats.activeLeases = (newStats.activeLeases || 0) + 1
							}
						}
						
						// Handle rent amount change
						if (values.rentAmount !== undefined) {
							newStats.totalMonthlyRent = (newStats.totalMonthlyRent || 0) - (oldLease.rentAmount || 0) + (values.rentAmount || 0)
						}
						
						return newStats
					})
				}
			}

			return { previousLeases, previousStats }
		},
		onError: (_err, _variables, context) => {
			// Rollback optimistic updates
			if (context?.previousLeases) {
				qc.setQueryData(['leases', 'ALL'], context.previousLeases)
			}
			if (context?.previousStats) {
				qc.setQueryData(['leases', 'stats'], context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteLease() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await leasesApi.remove(id)
			return true
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['leases'] })

			// Snapshot previous values
			const previousLeases = qc.getQueryData(['leases', 'ALL']) as _Lease[] | undefined
			const previousStats = qc.getQueryData(['leases', 'stats'])

			// Find the lease being deleted for stats update
			const leaseToDelete = previousLeases?.find(l => l.id === id)

			// Optimistically remove lease from cache
			qc.setQueryData(['leases', 'ALL'], (old: _Lease[] | undefined) => {
				if (!old) return old
				return old.filter(lease => lease.id !== id)
			})

			// Update stats optimistically
			if (leaseToDelete) {
				qc.setQueriesData({ queryKey: ['leases', 'stats'] }, (old: { totalLeases?: number, activeLeases?: number, totalMonthlyRent?: number } | undefined) => {
					if (!old) return old
					
					return {
						...old,
						totalLeases: Math.max(0, (old.totalLeases || 0) - 1),
						activeLeases: leaseToDelete.status === 'ACTIVE' ? Math.max(0, (old.activeLeases || 0) - 1) : old.activeLeases,
						totalMonthlyRent: Math.max(0, (old.totalMonthlyRent || 0) - (leaseToDelete.rentAmount || 0))
					}
				})
			}

			return { previousLeases, previousStats, deletedLease: leaseToDelete }
		},
		onError: (_err, _id, context) => {
			// Rollback optimistic updates
			if (context?.previousLeases) {
				qc.setQueryData(['leases', 'ALL'], context.previousLeases)
			}
			if (context?.previousStats) {
				qc.setQueryData(['leases', 'stats'], context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['leases'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
