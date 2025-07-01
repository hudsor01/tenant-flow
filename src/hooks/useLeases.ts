import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Lease } from '@/types/entities'
import type { LeaseWithRelations } from '@/types/relationships'

// Form data type (not stored in DB, just for UI)
interface LeaseFormData {
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'TERMINATED'
}

// Safe version that fetches lease data in separate steps to avoid circular RLS dependencies
export function useLeases(unitId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['leases', unitId, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      try {
        // Step 1: Get basic lease data (simple query)
        let leasesQuery = supabase
          .from('Lease')
          .select('*')

        // Filter by unit if provided
        if (unitId) {
          leasesQuery = leasesQuery.eq('unitId', unitId)
        }

        const { data: leases, error: leasesError } = await leasesQuery
          .order('startDate', { ascending: false })

        if (leasesError) {
          if (leasesError.code === 'PGRST116') {
            return []
          }
          throw leasesError
        }

        if (!leases || leases.length === 0) {
          return []
        }

        // Step 2: Get unit data for these leases (separate query)
        const unitIds = [...new Set(leases.map(l => l.unitId))]
        const { data: units, error: unitsError } = await supabase
          .from('Unit')
          .select(`
            id,
            unitNumber,
            bedrooms,
            bathrooms,
            squareFeet,
            rent,
            propertyId
          `)
          .in('id', unitIds)

        if (unitsError && unitsError.code !== 'PGRST116') {
          console.warn('Could not fetch unit data:', unitsError)
        }

        // Step 3: Get property data (separate query)
        let propertiesData = []
        if (units && units.length > 0) {
          const propertyIds = [...new Set(units.map(u => u.propertyId))]
          const { data: properties, error: propertiesError } = await supabase
            .from('Property')
            .select(`
              id,
              name,
              address,
              ownerId
            `)
            .in('id', propertyIds)
            .eq('ownerId', user.id) // Only properties owned by user

          if (propertiesError && propertiesError.code !== 'PGRST116') {
            console.warn('Could not fetch property data:', propertiesError)
          } else {
            propertiesData = properties || []
          }
        }

        // Step 4: Get tenant data (separate query)
        const tenantIds = [...new Set(leases.map(l => l.tenantId))]
        const { data: tenants, error: tenantsError } = await supabase
          .from('Tenant')
          .select(`
            id,
            name,
            email,
            phone,
            emergencyContact
          `)
          .in('id', tenantIds)

        if (tenantsError && tenantsError.code !== 'PGRST116') {
          console.warn('Could not fetch tenant data:', tenantsError)
        }

        // Step 5: Get payment data (separate query)
        const leaseIds = leases.map(l => l.id)
        const { data: payments, error: paymentsError } = await supabase
          .from('Payment')
          .select(`
            id,
            leaseId,
            amount,
            date,
            type,
            status,
            notes
          `)
          .in('leaseId', leaseIds)

        if (paymentsError && paymentsError.code !== 'PGRST116') {
          console.warn('Could not fetch payment data:', paymentsError)
        }

        // Step 6: Combine data client-side
        const leasesWithRelations = leases
          .map(lease => {
            const unit = (units || []).find(u => u.id === lease.unitId)
            const property = unit ? propertiesData.find(p => p.id === unit.propertyId) : null
            const tenant = (tenants || []).find(t => t.id === lease.tenantId)
            const leasePayments = (payments || []).filter(p => p.leaseId === lease.id)

            // Only include leases where user owns the property
            if (!property) {
              return null
            }

            return {
              ...lease,
              unit: unit ? {
                ...unit,
                property
              } : null,
              tenant: tenant || null,
              payments: leasePayments
            }
          })
          .filter(lease => lease !== null) // Remove leases without valid property ownership

        return leasesWithRelations as LeaseWithRelations[]
      } catch (error) {
        console.error('Error in useLeases:', error)
        return []
      }
    },
    enabled: !!user?.id,
    retry: false,
  })
}

export function useCreateLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: LeaseFormData) => {
      if (!user?.id) throw new Error('No user ID')

      // Verify user owns the unit/property
      const { data: unit } = await supabase
        .from('Unit')
        .select(`
          id,
          propertyId,
          property:Property!inner (
            ownerId
          )
        `)
        .eq('id', data.unitId)
        .single()

      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
      if (!unit || !property || property.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      // Check if unit is available (not already leased)
      const { data: existingLease } = await supabase
        .from('Lease')
        .select('id')
        .eq('unitId', data.unitId)
        .eq('status', 'ACTIVE')
        .single()

      if (existingLease) {
        throw new Error('Unit already has an active lease')
      }

      // Create the lease
      const { data: lease, error } = await supabase
        .from('Lease')
        .insert({
          unitId: data.unitId,
          tenantId: data.tenantId,
          startDate: data.startDate,
          endDate: data.endDate,
          rentAmount: data.rentAmount,
          securityDeposit: data.securityDeposit,
          status: data.status || 'ACTIVE',
        })
        .select(`
          *,
          unit:Unit (
            id,
            unitNumber,
            propertyId,
            property:Property (
              id,
              name,
              address
            )
          ),
          tenant:Tenant (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error

      // Update unit status to OCCUPIED if lease is ACTIVE
      if (!data.status || data.status === 'ACTIVE') {
        await supabase
          .from('Unit')
          .update({ status: 'OCCUPIED' })
          .eq('id', data.unitId)
      }

      return lease
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units', data.unit?.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useUpdateLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaseFormData> }) => {
      if (!user?.id) throw new Error('No user ID')

      // Get lease with unit/property info to verify ownership
      const { data: existingLease } = await supabase
        .from('Lease')
        .select(`
          *,
          unit:Unit!inner (
            id,
            propertyId,
            property:Property!inner (
              ownerId
            )
          )
        `)
        .eq('id', id)
        .single()

      const property = Array.isArray(existingLease?.unit?.property) ? existingLease.unit.property[0] : existingLease?.unit?.property;
      if (!existingLease || !property || property.ownerId !== user.id) {
        throw new Error('Lease not found or unauthorized')
      }

      // Update the lease
      const { data: updatedLease, error } = await supabase
        .from('Lease')
        .update({
          ...(data.startDate && { startDate: data.startDate }),
          ...(data.endDate && { endDate: data.endDate }),
          ...(data.rentAmount && { rentAmount: data.rentAmount }),
          ...(data.securityDeposit && { securityDeposit: data.securityDeposit }),
          ...(data.status && { status: data.status }),
        })
        .eq('id', id)
        .select(`
          *,
          unit:Unit (
            id,
            unitNumber,
            propertyId,
            property:Property (
              id,
              name,
              address
            )
          ),
          tenant:Tenant (
            id,
            name,
            email,
            phone
          )
        `)
        .single()

      if (error) throw error

      // Update unit status based on lease status
      if (data.status) {
        let unitStatus = 'VACANT'
        if (data.status === 'ACTIVE') unitStatus = 'OCCUPIED'
        else if (data.status === 'TERMINATED' || data.status === 'EXPIRED') unitStatus = 'VACANT'

        await supabase
          .from('Unit')
          .update({ status: unitStatus })
          .eq('id', existingLease.unitId)
      }

      return updatedLease
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units', data.unit?.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useDeleteLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      // Get lease with unit/property info to verify ownership
      const { data: lease } = await supabase
        .from('Lease')
        .select(`
          id,
          unitId,
          unit:Unit!inner (
            id,
            propertyId,
            property:Property!inner (
              ownerId
            )
          )
        `)
        .eq('id', id)
        .single()

      const unit = Array.isArray(lease?.unit) ? lease.unit[0] : lease?.unit;
      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
      if (!lease || !unit || !property || property.ownerId !== user.id) {
        throw new Error('Lease not found or unauthorized')
      }

      // Delete the lease
      const { error } = await supabase
        .from('Lease')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Update unit status to VACANT
      await supabase
        .from('Unit')
        .update({ status: 'VACANT' })
        .eq('id', lease.unitId)

      return { leaseId: id, unitId: lease.unitId, propertyId: unit?.propertyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useLeasesByProperty(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['leases', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId || !user?.id) throw new Error('Missing propertyId or user ID')

      // Verify user owns the property
      const { data: property } = await supabase
        .from('Property')
        .select('id')
        .eq('id', propertyId)
        .eq('ownerId', user.id)
        .single()

      if (!property) throw new Error('Property not found or unauthorized')

      const { data, error } = await supabase
        .from('Lease')
        .select(`
          *,
          unit:Unit (
            id,
            unitNumber,
            bedrooms,
            bathrooms,
            squareFeet,
            rent,
            propertyId
          ),
          tenant:Tenant (
            id,
            name,
            email,
            phone,
            emergencyContact
          ),
          payments:Payment (
            id,
            amount,
            paymentDate,
            type,
            status
          )
        `)
        .order('startDate', { ascending: false })

      if (error) throw error
      
      // Filter client-side for leases in the specific property
      const propertyLeases = data?.filter(lease => 
        lease.unit?.propertyId === propertyId
      ) || []
      
      return propertyLeases as Lease[]
    },
    enabled: !!propertyId && !!user?.id,
  })
}