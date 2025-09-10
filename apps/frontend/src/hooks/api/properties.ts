'use client'

import { propertiesApi } from '@/lib/api-client'
import type { Database } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'
import type { DashboardStats } from '@repo/shared'

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
		onMutate: async (newProperty) => {
			// Cancel outgoing refetches to prevent optimistic update conflicts
			await qc.cancelQueries({ queryKey: ['properties'] })

			// Snapshot previous value for rollback
			const previousProperties = qc.getQueryData(['properties', 'ALL'])

			// Optimistically update cache with new property
			qc.setQueryData(['properties', 'ALL'], (old: _Property[] | undefined) => {
				const optimisticProperty: _Property = {
					id: `temp-${Date.now()}`, // Temporary ID until server response
					...newProperty,
					ownerId: newProperty.ownerId || '',
					propertyType: newProperty.propertyType || 'APARTMENT',
					description: newProperty.description || null,
					imageUrl: newProperty.imageUrl || null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				return old ? [...old, optimisticProperty] : [optimisticProperty]
			})

			// Update dashboard stats optimistically
			qc.setQueriesData({ queryKey: dashboardKeys.stats() }, (old: DashboardStats | undefined) => {
				if (old) {
					return {
						...old,
						properties: {
							...old.properties,
							total: (old.properties?.total || 0) + 1
						}
					}
				}
				return old
			})

			// Return context for rollback
			return { previousProperties }
		},
		onError: (_err, _newProperty, context) => {
			// Rollback optimistic updates on error
			if (context?.previousProperties) {
				qc.setQueryData(['properties', 'ALL'], context.previousProperties)
			}
			// Also refresh stats to ensure consistency
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all properties queries to get server data
			qc.invalidateQueries({ queryKey: ['properties'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateProperty() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateProperty }) =>
			propertiesApi.update(id, values),
		onMutate: async ({ id, values }) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['properties'] })

			// Snapshot previous value
			const previousProperties = qc.getQueryData(['properties', 'ALL'])
			const previousStats = qc.getQueryData(dashboardKeys.stats())

			// Optimistically update property in cache
			qc.setQueryData(['properties', 'ALL'], (old: _Property[] | undefined) => {
				if (!old) return old
				return old.map(property => 
					property.id === id 
						? { ...property, ...values, updatedAt: new Date().toISOString() }
						: property
				)
			})

			return { previousProperties, previousStats }
		},
		onError: (_err, _variables, context) => {
			// Rollback optimistic updates
			if (context?.previousProperties) {
				qc.setQueryData(['properties', 'ALL'], context.previousProperties)
			}
			if (context?.previousStats) {
				qc.setQueryData(dashboardKeys.stats(), context.previousStats)
			}
		},
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
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['properties'] })

			// Snapshot previous values
			const previousProperties = qc.getQueryData(['properties', 'ALL']) as _Property[] | undefined
			const previousStats = qc.getQueryData(dashboardKeys.stats())

			// Find the property being deleted for stats update
			const propertyToDelete = previousProperties?.find(p => p.id === id)

			// Optimistically remove property from cache
			qc.setQueryData(['properties', 'ALL'], (old: _Property[] | undefined) => {
				if (!old) return old
				return old.filter(property => property.id !== id)
			})

			// Update dashboard stats optimistically
			if (propertyToDelete) {
				qc.setQueriesData({ queryKey: dashboardKeys.stats() }, (old: DashboardStats | undefined) => {
					if (!old) return old
					
					return {
						...old,
						properties: {
							...old.properties,
							total: Math.max(0, (old.properties?.total || 0) - 1)
						}
					}
				})
			}

			return { previousProperties, previousStats, deletedProperty: propertyToDelete }
		},
		onError: (_err, _id, context) => {
			// Rollback optimistic updates
			if (context?.previousProperties) {
				qc.setQueryData(['properties', 'ALL'], context.previousProperties)
			}
			if (context?.previousStats) {
				qc.setQueryData(dashboardKeys.stats(), context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['properties'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
