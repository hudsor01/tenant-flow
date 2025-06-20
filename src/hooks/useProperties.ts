import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
// Removed unused Property import - using PropertyWithUnits instead
import type { PropertyWithUnits } from '@/types/relationships'

// Form data type
interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description?: string
  imageUrl?: string
  propertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
  // Unit creation fields (UI only)
  numberOfUnits?: number
  createUnitsNow?: boolean
}

export function useProperties() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Full query with proper RLS filtering
      const { data, error } = await supabase
        .from('Property')
        .select(`
          *,
          units:Unit (
            id,
            unitNumber,
            bedrooms,
            bathrooms,
            squareFeet,
            rent,
            status,
            leases:Lease (
              id,
              startDate,
              endDate,
              rentAmount,
              securityDeposit,
              status,
              tenant:Tenant (
                id,
                name,
                email,
                phone
              )
            )
          )
        `)
        .eq('ownerId', user.id)
        .order('createdAt', { ascending: false })

      if (error) {
        // Handle empty result gracefully
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }
      return data as PropertyWithUnits[]
    },
    enabled: !!user?.id,
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: PropertyFormData) => {
      if (!user?.id) throw new Error('No user ID')

      // Create the property first
      const { data: property, error: propertyError } = await supabase
        .from('Property')
        .insert({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          description: data.description,
          imageUrl: data.imageUrl,
          propertyType: data.propertyType,
          ownerId: user.id,
        })
        .select()
        .single()

      if (propertyError) throw propertyError

      // Always create at least one unit for all properties
      let unitsToCreate = []
      
      if (data.propertyType === 'SINGLE_FAMILY') {
        // Single family always gets one default unit
        unitsToCreate = [{
          unitNumber: '1',
          propertyId: property.id,
          bedrooms: 3,
          bathrooms: 2,
          squareFeet: 1200,
          rent: 1500,
          status: 'VACANT',
        }]
      } else if (data.createUnitsNow && data.numberOfUnits && data.numberOfUnits > 0) {
        // Multi-unit properties with user-specified number
        for (let i = 1; i <= data.numberOfUnits; i++) {
          unitsToCreate.push({
            unitNumber: i.toString(),
            propertyId: property.id,
            bedrooms: 1,
            bathrooms: 1,
            squareFeet: 750,
            rent: 1000,
            status: 'VACANT',
          })
        }
      }

      if (unitsToCreate.length > 0) {
        const { error: unitsError } = await supabase
          .from('Unit')
          .insert(unitsToCreate)

        if (unitsError) {
          console.error('Failed to create units:', unitsError)
          // Don't throw here - property was created successfully
        } else {
          // Return success info for toast
          return { ...property, unitsCreated: unitsToCreate.length }
        }
      }

      return property
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PropertyFormData }) => {
      if (!user?.id) throw new Error('No user ID')

      const { data: property, error } = await supabase
        .from('Property')
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          description: data.description,
          imageUrl: data.imageUrl,
          propertyType: data.propertyType,
        })
        .eq('id', id)
        .eq('ownerId', user.id) // Ensure user owns the property
        .select()
        .single()

      if (error) throw error
      return property
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('Property')
        .delete()
        .eq('id', id)
        .eq('ownerId', user.id) // Ensure user owns the property

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
