import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface TenantDashboardData {
  tenant: {
    id: string
    name: string
    email: string
    phone?: string
  }
  property: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode?: string
    unit: {
      id: string
      unitNumber: string
      rent: number
    }
  }
  lease: {
    id: string
    startDate: string
    endDate: string
    rentAmount: number
    status: string
    securityDeposit?: number
  }
  propertyOwner: {
    name: string
    email: string
    phone?: string
  }
  upcomingPayments: Array<{
    id: string
    type: string
    amount: number
    dueDate: string
    status: string
  }>
  maintenanceRequests: Array<{
    id: string
    title: string
    description?: string
    status: string
    priority: string
    createdAt: string
    updatedAt: string
  }>
  paymentHistory: Array<{
    id: string
    amount: number
    paymentDate: string
    type: string
    status: string
  }>
}

export function useTenantData() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['tenant-dashboard', user?.id],
    queryFn: async (): Promise<TenantDashboardData | null> => {
      if (!user?.id) throw new Error('No user ID')

      // Get tenant record for the authenticated user
      const { data: tenant, error: tenantError } = await supabase
        .from('Tenant')
        .select(`
          id,
          name,
          email,
          phone,
          leases:Lease!inner (
            id,
            startDate,
            endDate,
            rentAmount,
            securityDeposit,
            status,
            unit:Unit!inner (
              id,
              unitNumber,
              rent,
              property:Property!inner (
                id,
                name,
                address,
                city,
                state,
                zipCode,
                ownerId,
                owner:User!ownerId (
                  id,
                  name,
                  email,
                  phone
                )
              )
            )
          )
        `)
        .eq('userId', user.id)
        .eq('leases.status', 'ACTIVE')
        .single()

      if (tenantError || !tenant) {
        console.error('Tenant not found:', tenantError)
        return null
      }

      // Get the active lease (should be only one due to filter)
      const activeLease = tenant.leases[0]
      if (!activeLease) {
        throw new Error('No active lease found')
      }

      const unit = Array.isArray(activeLease.unit) ? activeLease.unit[0] : activeLease.unit
      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property
      const owner = Array.isArray(property?.owner) ? property.owner[0] : property?.owner

      // Get upcoming payments (generate based on lease)
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const upcomingPayments = [{
        id: `rent-${nextMonth.getTime()}`,
        type: 'Rent',
        amount: activeLease.rentAmount,
        dueDate: nextMonth.toISOString().split('T')[0],
        status: 'pending'
      }]

      // Get maintenance requests for this tenant's unit
      const { data: maintenanceRequests = [] } = await supabase
        .from('MaintenanceRequest')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          createdAt,
          updatedAt
        `)
        .eq('unitId', unit?.id)
        .order('createdAt', { ascending: false })
        .limit(10)

      // Get payment history for this tenant's lease
      const { data: paymentHistory = [] } = await supabase
        .from('Payment')
        .select(`
          id,
          amount,
          date,
          type,
          status
        `)
        .eq('leaseId', activeLease.id)
        .order('date', { ascending: false })
        .limit(12)

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || undefined,
        },
        property: {
          id: property?.id || '',
          name: property?.name || '',
          address: property?.address || '',
          city: property?.city || '',
          state: property?.state || '',
          zipCode: property?.zipCode || undefined,
          unit: {
            id: unit?.id || '',
            unitNumber: unit?.unitNumber || '',
            rent: unit?.rent || 0,
          },
        },
        lease: {
          id: activeLease.id,
          startDate: activeLease.startDate,
          endDate: activeLease.endDate,
          rentAmount: activeLease.rentAmount,
          status: activeLease.status,
          securityDeposit: activeLease.securityDeposit || undefined,
        },
        propertyOwner: {
          name: owner?.name || 'Property Owner',
          email: owner?.email || '',
          phone: owner?.phone || undefined,
        },
        upcomingPayments,
        maintenanceRequests: (maintenanceRequests || []).map(request => ({
          id: request.id,
          title: request.title,
          description: request.description || undefined,
          status: request.status,
          priority: request.priority,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        })),
        paymentHistory: (paymentHistory || []).map(payment => ({
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.date,
          type: payment.type,
          status: payment.status,
        })),
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateMaintenanceRequest() {
  const { user } = useAuthStore()

  return async (data: {
    title: string
    description: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    unitId: string
  }) => {
    if (!user?.id) throw new Error('No user ID')

    // Verify the user is the tenant for this unit
    const { data: tenant } = await supabase
      .from('Tenant')
      .select(`
        id,
        leases:Lease!inner (
          id,
          unitId,
          status
        )
      `)
      .eq('userId', user.id)
      .eq('leases.unitId', data.unitId)
      .eq('leases.status', 'ACTIVE')
      .single()

    if (!tenant) {
      throw new Error('Unauthorized: No active lease for this unit')
    }

    const { data: request, error } = await supabase
      .from('MaintenanceRequest')
      .insert({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'PENDING',
        unitId: data.unitId,
        tenantId: tenant.id,
      })
      .select()
      .single()

    if (error) throw error
    return request
  }
}
