'use client'

import { unitsApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'
import type { DashboardStats } from '@repo/shared'

type _Unit = Database['public']['Tables']['Unit']['Row']
type InsertUnit = Database['public']['Tables']['Unit']['Insert']
type UpdateUnit = Database['public']['Tables']['Unit']['Update']

type UnitStatus = Database['public']['Enums']['UnitStatus']

export function useUnits(status?: UnitStatus) {
	return useQuery({
		queryKey: ['units', status ?? 'ALL'],
		queryFn: async () => {
			return unitsApi.list(status ? { status } : undefined)
		}
	})
}

export function useCreateUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertUnit) => unitsApi.create(values),
		onMutate: async (newUnit) => {
			// Cancel outgoing refetches to prevent optimistic update conflicts
			await qc.cancelQueries({ queryKey: ['units'] })

			// Snapshot previous value for rollback
			const previousUnits = qc.getQueryData(['units', 'ALL'])

			// Optimistically update cache with new unit
			qc.setQueryData(['units', 'ALL'], (old: _Unit[] | undefined) => {
				const optimisticUnit: _Unit = {
					id: `temp-${Date.now()}`, // Temporary ID until server response
					...newUnit,
					bedrooms: newUnit.bedrooms || 0,
					bathrooms: newUnit.bathrooms || 0,
					squareFeet: newUnit.squareFeet || null,
					lastInspectionDate: null,
					status: newUnit.status || 'VACANT',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				return old ? [...old, optimisticUnit] : [optimisticUnit]
			})

			// Update dashboard stats optimistically
			qc.setQueriesData({ queryKey: dashboardKeys.stats() }, (old: DashboardStats | undefined) => {
				if (old) {
					return {
						...old,
						units: {
							...old.units,
							total: (old.units.total || 0) + 1,
							vacant: newUnit.status === 'VACANT' ? (old.units.vacant || 0) + 1 : old.units.vacant,
							occupied: newUnit.status === 'OCCUPIED' ? (old.units.occupied || 0) + 1 : old.units.occupied,
							maintenance: newUnit.status === 'MAINTENANCE' ? (old.units.maintenance || 0) + 1 : old.units.maintenance
						}
					}
				}
				return old
			})

			// Return context for rollback
			return { previousUnits }
		},
		onError: (_err, _newUnit, context) => {
			// Rollback optimistic updates on error
			if (context?.previousUnits) {
				qc.setQueryData(['units', 'ALL'], context.previousUnits)
			}
			// Also refresh stats to ensure consistency
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all units queries to get server data
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateUnit }) =>
			unitsApi.update(id, values),
		onMutate: async ({ id, values }) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['units'] })

			// Snapshot previous value
			const previousUnits = qc.getQueryData(['units', 'ALL'])
			const previousStats = qc.getQueryData(dashboardKeys.stats())

			// Optimistically update unit in cache
			qc.setQueryData(['units', 'ALL'], (old: _Unit[] | undefined) => {
				if (!old) return old
				return old.map(unit => 
					unit.id === id 
						? { ...unit, ...values, updatedAt: new Date().toISOString() }
						: unit
				)
			})

			// Update stats if status changed
			if (values.status && previousUnits) {
				const oldUnit = (previousUnits as _Unit[]).find(u => u.id === id)
				if (oldUnit && oldUnit.status !== values.status) {
					qc.setQueriesData({ queryKey: dashboardKeys.stats() }, (old: DashboardStats | undefined) => {
						if (!old) return old
						
						// Decrement old status count and increment new status count
						const updatedUnits = { ...old.units }
						
						// Decrement old status
						if (oldUnit.status === 'VACANT') updatedUnits.vacant = Math.max(0, (updatedUnits.vacant || 0) - 1)
						else if (oldUnit.status === 'OCCUPIED') updatedUnits.occupied = Math.max(0, (updatedUnits.occupied || 0) - 1)
						else if (oldUnit.status === 'MAINTENANCE') updatedUnits.maintenance = Math.max(0, (updatedUnits.maintenance || 0) - 1)
						
						// Increment new status
						if (values.status === 'VACANT') updatedUnits.vacant = (updatedUnits.vacant || 0) + 1
						else if (values.status === 'OCCUPIED') updatedUnits.occupied = (updatedUnits.occupied || 0) + 1
						else if (values.status === 'MAINTENANCE') updatedUnits.maintenance = (updatedUnits.maintenance || 0) + 1
						
						return {
							...old,
							units: updatedUnits
						}
					})
				}
			}

			return { previousUnits, previousStats }
		},
		onError: (_err, _variables, context) => {
			// Rollback optimistic updates
			if (context?.previousUnits) {
				qc.setQueryData(['units', 'ALL'], context.previousUnits)
			}
			if (context?.previousStats) {
				qc.setQueryData(dashboardKeys.stats(), context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteUnit() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			await unitsApi.remove(id)
			return true
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['units'] })

			// Snapshot previous values
			const previousUnits = qc.getQueryData(['units', 'ALL']) as _Unit[] | undefined
			const previousStats = qc.getQueryData(dashboardKeys.stats())

			// Find the unit being deleted for stats update
			const unitToDelete = previousUnits?.find(u => u.id === id)

			// Optimistically remove unit from cache
			qc.setQueryData(['units', 'ALL'], (old: _Unit[] | undefined) => {
				if (!old) return old
				return old.filter(unit => unit.id !== id)
			})

			// Update dashboard stats optimistically
			if (unitToDelete) {
				qc.setQueriesData({ queryKey: dashboardKeys.stats() }, (old: DashboardStats | undefined) => {
					if (!old) return old
					
					const updatedUnits = { ...old.units }
					updatedUnits.total = Math.max(0, (updatedUnits.total || 0) - 1)
					
					// Decrement the specific status count
					if (unitToDelete.status === 'VACANT') updatedUnits.vacant = Math.max(0, (updatedUnits.vacant || 0) - 1)
					else if (unitToDelete.status === 'OCCUPIED') updatedUnits.occupied = Math.max(0, (updatedUnits.occupied || 0) - 1)
					else if (unitToDelete.status === 'MAINTENANCE') updatedUnits.maintenance = Math.max(0, (updatedUnits.maintenance || 0) - 1)
					
					return {
						...old,
						units: updatedUnits
					}
				})
			}

			return { previousUnits, previousStats, deletedUnit: unitToDelete }
		},
		onError: (_err, _id, context) => {
			// Rollback optimistic updates
			if (context?.previousUnits) {
				qc.setQueryData(['units', 'ALL'], context.previousUnits)
			}
			if (context?.previousStats) {
				qc.setQueryData(dashboardKeys.stats(), context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['units'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
