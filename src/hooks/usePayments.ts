import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Payment, PaymentType } from '@/types/entities'
import type { PaymentAnalyticsData } from '@/types/analytics'
import type { PaymentWithRelations } from '@/types/relationships'

// Form data type (not stored in DB, just for UI)
interface PaymentFormData {
  leaseId: string
  amount: number
  date: string
  type: PaymentType
  notes?: string
}

export function usePayments(leaseId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['payments', leaseId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      let query = supabase
        .from('Payment')
        .select(`
          *,
          lease:Lease!inner (
            id,
            rentAmount,
            securityDeposit,
            startDate,
            endDate,
            status,
            unit:Unit!inner (
              id,
              unitNumber,
              property:Property!inner (
                id,
                name,
                address,
                ownerId
              )
            ),
            tenant:Tenant (
              id,
              name,
              email,
              phone
            )
          )
        `)

      // If leaseId provided, filter by lease
      if (leaseId) {
        query = query.eq('leaseId', leaseId)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      // Authorization check - ensure user owns the properties
      const authorizedPayments = data?.filter(payment => {
        const unit = Array.isArray(payment.lease?.unit) ? payment.lease.unit[0] : payment.lease?.unit;
        const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
        return property?.ownerId === user.id;
      }) || []

      return authorizedPayments as PaymentWithRelations[]
    },
    enabled: !!user?.id,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!user?.id) throw new Error('No user ID')

      // Verify user owns the lease/property
      const { data: lease } = await supabase
        .from('Lease')
        .select(`
          id,
          unit:Unit!inner (
            id,
            property:Property!inner (
              ownerId
            )
          )
        `)
        .eq('id', data.leaseId)
        .single()

      const unit = Array.isArray(lease?.unit) ? lease.unit[0] : lease?.unit;
      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
      if (!lease || !property || property.ownerId !== user.id) {
        throw new Error('Lease not found or unauthorized')
      }

      // Create the payment
      const { data: payment, error } = await supabase
        .from('Payment')
        .insert({
          leaseId: data.leaseId,
          amount: data.amount,
          paymentDate: data.date,
          type: data.type,
          status: 'COMPLETED', // Manual entry defaults to completed
          notes: data.notes,
        })
        .select(`
          *,
          lease:Lease (
            id,
            rentAmount,
            unit:Unit (
              id,
              unitNumber,
              property:Property (
                id,
                name
              )
            ),
            tenant:Tenant (
              id,
              name,
              email
            )
          )
        `)
        .single()

      if (error) throw error
      return payment
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments', data.leaseId] })
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] })
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentFormData> }) => {
      if (!user?.id) throw new Error('No user ID')

      // Get payment with lease/property info to verify ownership
      const { data: existingPayment } = await supabase
        .from('Payment')
        .select(`
          *,
          lease:Lease!inner (
            id,
            unit:Unit!inner (
              property:Property!inner (
                ownerId
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      const unit = Array.isArray(existingPayment?.lease?.unit) ? existingPayment.lease.unit[0] : existingPayment?.lease?.unit;
      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
      if (!existingPayment || !property || property.ownerId !== user.id) {
        throw new Error('Payment not found or unauthorized')
      }

      // Update the payment
      const { data: updatedPayment, error } = await supabase
        .from('Payment')
        .update({
          ...(data.amount && { amount: data.amount }),
          ...(data.date && { paymentDate: data.date }),
          ...(data.type && { type: data.type }),
          ...(data.notes !== undefined && { notes: data.notes }),
        })
        .eq('id', id)
        .select(`
          *,
          lease:Lease (
            id,
            rentAmount,
            unit:Unit (
              id,
              unitNumber,
              property:Property (
                id,
                name
              )
            ),
            tenant:Tenant (
              id,
              name,
              email
            )
          )
        `)
        .single()

      if (error) throw error
      return updatedPayment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments', data.leaseId] })
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      // Get payment with lease/property info to verify ownership
      const { data: payment } = await supabase
        .from('Payment')
        .select(`
          id,
          leaseId,
          lease:Lease!inner (
            id,
            unit:Unit!inner (
              property:Property!inner (
                ownerId
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      const lease = Array.isArray(payment?.lease) ? payment.lease[0] : payment?.lease;
      const unit = Array.isArray(lease?.unit) ? lease.unit[0] : lease?.unit;
      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
      if (!payment || !lease || !property || property.ownerId !== user.id) {
        throw new Error('Payment not found or unauthorized')
      }

      // Delete the payment
      const { error } = await supabase
        .from('Payment')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { paymentId: id, leaseId: payment.leaseId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments', data.leaseId] })
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] })
    },
  })
}

export function usePaymentsByProperty(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['payments', 'property', propertyId],
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

      // First get all units for this property
      const { data: units } = await supabase
        .from('Unit')
        .select('id')
        .eq('propertyId', propertyId)

      if (!units || units.length === 0) return []

      // Get all leases for these units
      const { data: leases } = await supabase
        .from('Lease')
        .select('id')
        .in('unitId', units.map(u => u.id))

      if (!leases || leases.length === 0) return []

      // Get all payments for these leases
      const { data, error } = await supabase
        .from('Payment')
        .select(`
          *,
          lease:Lease!inner (
            id,
            rentAmount,
            securityDeposit,
            unit:Unit!inner (
              id,
              unitNumber,
              propertyId,
              property:Property (
                id,
                name
              )
            ),
            tenant:Tenant (
              id,
              name,
              email,
              phone
            )
          )
        `)
        .in('leaseId', leases.map(l => l.id))
        .order('date', { ascending: false })

      if (error) throw error
      return data as Payment[]
    },
    enabled: !!propertyId && !!user?.id,
  })
}

export function usePaymentAnalytics(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['payment-analytics', propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Get all payments with full relation data
      const { data: allPayments, error } = await supabase
        .from('Payment')
        .select(`
          *,
          lease:Lease!inner (
            id,
            rentAmount,
            securityDeposit,
            unit:Unit!inner (
              id,
              unitNumber,
              propertyId,
              property:Property!inner (
                id,
                name,
                ownerId
              )
            ),
            tenant:Tenant (
              id,
              name
            )
          )
        `)
        .order('date', { ascending: false })

      if (error) throw error

      // Filter payments client-side
      let payments = allPayments?.filter(payment => {
        const unit = payment.lease?.unit
        const property = unit?.property
        return property?.ownerId === user.id
      }) || []

      // If propertyId provided, further filter by property
      if (propertyId) {
        payments = payments.filter(payment => {
          const unit = payment.lease?.unit
          return unit?.propertyId === propertyId
        })
      }

      // Calculate analytics
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const currentYear = now.getFullYear()

      const analytics: PaymentAnalyticsData = {
        totalPayments: payments?.length || 0,
        totalAmount: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
        
        // Current month stats
        currentMonthPayments: payments?.filter(p => 
          new Date(p.paymentDate) >= currentMonth
        ).length || 0,
        currentMonthAmount: payments?.filter(p => 
          new Date(p.paymentDate) >= currentMonth
        ).reduce((sum, p) => sum + p.amount, 0) || 0,
        
        // Last month stats
        lastMonthPayments: payments?.filter(p => {
          const paymentDate = new Date(p.paymentDate)
          return paymentDate >= lastMonth && paymentDate < currentMonth
        }).length || 0,
        lastMonthAmount: payments?.filter(p => {
          const paymentDate = new Date(p.paymentDate)
          return paymentDate >= lastMonth && paymentDate < currentMonth
        }).reduce((sum, p) => sum + p.amount, 0) || 0,
        
        // Current year stats
        currentYearAmount: payments?.filter(p => 
          new Date(p.paymentDate).getFullYear() === currentYear
        ).reduce((sum, p) => sum + p.amount, 0) || 0,
        currentYearPayments: payments?.filter(p => 
          new Date(p.paymentDate).getFullYear() === currentYear
        ).length || 0,
        
        // Average payment
        averagePaymentAmount: payments?.length > 0 
          ? (payments.reduce((sum, p) => sum + p.amount, 0) / payments.length)
          : 0,
        
        // Payment types breakdown
        paymentTypes: payments?.reduce((acc, p) => {
          acc[p.type] = (acc[p.type] || 0) + p.amount
          return acc
        }, {} as Record<string, number>) || {},
        
        // Monthly breakdown for charts
        monthlyData: payments?.reduce((acc, p) => {
          const monthKey = new Date(p.paymentDate).toISOString().slice(0, 7) // YYYY-MM
          if (!acc[monthKey]) {
            acc[monthKey] = { month: monthKey, amount: 0, count: 0 }
          }
          acc[monthKey].amount += p.amount
          acc[monthKey].count += 1
          return acc
        }, {} as Record<string, { month: string; amount: number; count: number }>) || {},
        
        // Top paying tenants
        topPayingTenants: payments?.reduce((acc, p) => {
          const tenant = p.lease?.tenant
          if (tenant) {
            const existing = acc.find((t: { tenantId: string; tenantName: string; totalAmount: number; paymentCount: number }) => t.tenantId === tenant.id)
            if (existing) {
              existing.totalAmount += p.amount
              existing.paymentCount += 1
            } else {
              acc.push({
                tenantId: tenant.id,
                tenantName: tenant.name || 'Unknown',
                totalAmount: p.amount,
                paymentCount: 1
              })
            }
          }
          return acc
        }, [] as Array<{
          tenantId: string
          tenantName: string
          totalAmount: number
          paymentCount: number
        }>) || []
      }

      return analytics
    },
    enabled: !!user?.id,
  })
}

export function usePaymentsByTenant(tenantId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['payments', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId || !user?.id) throw new Error('Missing tenantId or user ID')

      // First get all leases for this tenant
      const { data: leases } = await supabase
        .from('Lease')
        .select(`
          id,
          unit:Unit!inner (
            property:Property!inner (
              ownerId
            )
          )
        `)
        .eq('tenantId', tenantId)

      if (!leases || leases.length === 0) return []

      // Filter leases to only those owned by current user
      const ownedLeases = leases.filter(lease => {
        const unit = Array.isArray(lease.unit) ? lease.unit[0] : lease.unit;
        const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
        return property?.ownerId === user.id;
      });

      if (ownedLeases.length === 0) return []

      // Get all payments for these leases
      const { data, error } = await supabase
        .from('Payment')
        .select(`
          *,
          lease:Lease!inner (
            id,
            rentAmount,
            securityDeposit,
            unit:Unit!inner (
              id,
              unitNumber,
              property:Property (
                id,
                name
              )
            ),
            tenant:Tenant (
              id,
              name,
              email,
              phone
            )
          )
        `)
        .in('leaseId', ownedLeases.map(l => l.id))
        .order('date', { ascending: false })

      if (error) throw error
      return data as Payment[]
    },
    enabled: !!tenantId && !!user?.id,
  })
}