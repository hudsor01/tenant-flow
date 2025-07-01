import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { PropertyWithUnits } from '@/types/relationships'

// Safe version that avoids infinite recursion
export function usePropertiesSafe() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['properties-safe', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      try {
        // Step 1: Get properties (simple query)
        const { data: properties, error: propError } = await supabase
          .from('Property')
          .select('*')
          .eq('ownerId', user.id)
          .order('createdAt', { ascending: false })

        if (propError) {
          console.error('Property query error:', propError)
          return []
        }

        if (!properties || properties.length === 0) {
          return []
        }

        // Step 2: Get units for all properties (separate query)
        const propertyIds = properties.map(p => p.id)
        const { data: units, error: unitError } = await supabase
          .from('Unit')
          .select('*')
          .in('propertyId', propertyIds)

        if (unitError) {
          console.error('Unit query error:', unitError)
          // Return properties without units rather than failing completely
          return properties.map(p => ({ ...p, units: [] }))
        }

        // Step 3: Manually combine the data
        const propertiesWithUnits = properties.map(property => ({
          ...property,
          units: units?.filter(unit => unit.propertyId === property.id) || []
        }))

        return propertiesWithUnits as PropertyWithUnits[]
      } catch (error) {
        console.error('Properties query failed:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once
  })
}