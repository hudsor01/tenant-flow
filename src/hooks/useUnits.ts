import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Unit, UnitStatus } from '@/types/entities'

// Form data type (not stored in DB, just for UI)
interface UnitFormData {
  unitNumber: string
  propertyId: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  rent: number
  status: UnitStatus
}

export function useUnits(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      if (!propertyId) throw new Error('No property ID')

      // First verify user owns the property
      const { data: property } = await supabase
        .from('Property')
        .select('id')
        .eq('id', propertyId)
        .eq('ownerId', user?.id)
        .single()

      if (!property) throw new Error('Property not found or unauthorized')

      const { data, error } = await supabase
        .from('Unit')
        .select(`
          *,
          property:Property (
            id,
            name,
            address
          ),
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
          ),
          maintenanceRequests:MaintenanceRequest (
            id,
            title,
            description,
            priority,
            status,
            createdAt
          )
        `)
        .eq('propertyId', propertyId)
        .order('unitNumber', { ascending: true })

      if (error) throw error
      return data as Unit[]
    },
    enabled: !!propertyId && !!user?.id,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: UnitFormData) => {
      if (!user?.id) throw new Error('No user ID')

      // Verify user owns the property
      const { data: property } = await supabase
        .from('Property')
        .select('id')
        .eq('id', data.propertyId)
        .eq('ownerId', user.id)
        .single()

      if (!property) throw new Error('Property not found or unauthorized')

      const { data: unit, error } = await supabase
        .from('Unit')
        .insert({
          unitNumber: data.unitNumber,
          propertyId: data.propertyId,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          rent: data.rent,
          status: data.status,
        })
        .select()
        .single()

      if (error) throw error
      return unit
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      if (!user?.id) throw new Error('No user ID')

      // Get unit with property info to verify ownership
      const { data: unit } = await supabase
        .from('Unit')
        .select(`
          *,
          property:Property!inner (
            ownerId
          )
        `)
        .eq('id', id)
        .single()

      if (!unit || !unit.property || !Array.isArray(unit.property) || unit.property[0]?.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { data: updatedUnit, error } = await supabase
        .from('Unit')
        .update({
          unitNumber: data.unitNumber,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          rent: data.rent,
          status: data.status,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return updatedUnit
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      // Get unit with property info to verify ownership
      const { data: unit } = await supabase
        .from('Unit')
        .select(`
          id,
          propertyId,
          property:Property!inner (
            ownerId
          )
        `)
        .eq('id', id)
        .single()

      if (!unit || !unit.property || !Array.isArray(unit.property) || unit.property[0]?.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { error } = await supabase
        .from('Unit')
        .delete()
        .eq('id', id)

      if (error) throw error
      return unit.propertyId
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}