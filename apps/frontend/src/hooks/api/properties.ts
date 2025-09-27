'use client'

import { createClient } from '@/utils/supabase/client'
import type { Database, PropertyPerformance } from '@repo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'
import type { DashboardStats } from '@repo/shared'

type _Property = Database['public']['Tables']['Property']['Row']
type InsertProperty = Database['public']['Tables']['Property']['Insert']
type UpdateProperty = Database['public']['Tables']['Property']['Update']

type PropertyStatus = Database['public']['Enums']['PropertyStatus']

const supabase = createClient()

export function useProperties(status?: PropertyStatus) {
    return useQuery({
        queryKey: ['properties', status ?? 'ALL'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let query = supabase
                .from('Property')
                .select('*')
                .eq('ownerId', user.id)
                .order('createdAt', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })
}

// Server-calculated property analytics (properties with units)
export function usePropertyPerformance() {
  return useQuery<PropertyPerformance[]>({
    queryKey: ['properties', 'analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use RPC function for property performance calculations
      const { data, error } = await supabase
        .rpc('get_property_performance', {
          p_user_id: user.id
        })

      if (error) throw error
      // Cast Json[] to PropertyPerformance[]
      return (data as unknown as PropertyPerformance[]) || []
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

// Enhanced hook with select transformation for table-ready properties data
export function usePropertiesFormatted(status?: PropertyStatus) {
    return useQuery({
        queryKey: ['properties', status ?? 'ALL'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let query = supabase
                .from('Property')
                .select('*')
                .eq('ownerId', user.id)
                .order('createdAt', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        },
        select: (data: _Property[]) => ({
            properties: data.map((property: _Property) => ({
                ...property,
                // Format display values (replaces useMemo in table components)
                displayAddress: `${property.address}, ${property.city}, ${property.state}`,
                displayType: property.propertyType.charAt(0) + property.propertyType.slice(1).toLowerCase(),
                statusDisplay: 'Active', // Default status since property.status doesn't exist in DB
                // Add status color for consistent UI (replaces inline calculations)
                statusColor: getPropertyStatusColor('ACTIVE'),
                // Format dates for display
                createdAtFormatted: new Date(property.createdAt).toLocaleDateString(),
                updatedAtFormatted: new Date(property.updatedAt).toLocaleDateString(),
                // Calculate property age for sorting/filtering
                ageInDays: Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            })),
            // Pre-calculate summary stats for dashboard widgets
            summary: {
                total: data.length,
                byStatus: data.reduce((acc: Record<string, number>) => {
                    const status = 'ACTIVE' // Default status since property.status doesn't exist in DB
                    acc[status] = (acc[status] || 0) + 1
                    return acc
                }, {} as Record<string, number>),
                byType: data.reduce((acc: Record<string, number>, prop: _Property) => {
                    acc[prop.propertyType] = (acc[prop.propertyType] || 0) + 1
                    return acc
                }, {} as Record<string, number>),
                recentlyAdded: data.filter((prop: _Property) => 
                    Date.now() - new Date(prop.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
                ).length
            }
        })
    })
}

// Helper function for consistent status color coding
function getPropertyStatusColor(status?: string): string {
    const colorMap: Record<string, string> = {
        'ACTIVE': 'hsl(var(--primary))', // use primary for active
        'MAINTENANCE': 'hsl(var(--accent))', // use accent for maintenance
        'VACANT': 'hsl(var(--muted-foreground))', // use muted for vacant
        'PENDING': 'hsl(var(--primary))', // use primary for pending
        'INACTIVE': 'hsl(var(--destructive))' // use destructive for inactive
    }
    return colorMap[status || 'INACTIVE'] || 'hsl(var(--muted-foreground))'
}


export function useCreateProperty() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (values: InsertProperty) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('Property')
                .insert({ ...values, ownerId: user.id })
                .select()
                .single()

            if (error) throw error
            return data
        },
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
					status: 'ACTIVE',
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
        mutationFn: async ({ id, values }: { id: string; values: UpdateProperty }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('Property')
                .update(values)
                .eq('id', id)
                .eq('ownerId', user.id) // RLS check
                .select()
                .single()

            if (error) throw error
            return data
        },
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('Property')
                .delete()
                .eq('id', id)
                .eq('ownerId', user.id) // RLS check

            if (error) throw error
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