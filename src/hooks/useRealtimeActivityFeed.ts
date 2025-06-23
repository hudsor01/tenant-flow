import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { Activity } from './useActivityFeed'

interface RealtimeActivity extends Activity {
  isNew?: boolean
  timestamp?: number
}

export function useRealtimeActivityFeed(limit = 10) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [realtimeActivities, setRealtimeActivities] = useState<RealtimeActivity[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Base query for initial data load
  const { data: initialData = [], isLoading, error } = useQuery({
    queryKey: ['activityFeed', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []

      const activities: Activity[] = []
      const batchLimit = Math.ceil(limit / 5)

      try {
        const [
          propertiesResult,
          maintenanceResult,
          paymentsResult,
          leasesResult,
          tenantsResult
        ] = await Promise.allSettled([
          supabase
            .from('Property')
            .select('id, name, createdAt, ownerId, owner:User(name)')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          supabase
            .from('MaintenanceRequest')
            .select(`
              id, 
              title, 
              priority,
              status,
              createdAt,
              unit:Unit(
                unitNumber,
                property:Property(name, ownerId)
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          supabase
            .from('Payment')
            .select(`
              id,
              amount,
              type,
              status,
              createdAt,
              lease:Lease(
                rentAmount,
                tenant:Tenant(name),
                unit:Unit(
                  unitNumber,
                  property:Property(name, ownerId)
                )
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          supabase
            .from('Lease')
            .select(`
              id,
              status,
              startDate,
              endDate,
              createdAt,
              tenant:Tenant(name),
              unit:Unit(
                unitNumber,
                property:Property(name, ownerId)
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          supabase
            .from('Tenant')
            .select(`
              id,
              name,
              invitationStatus,
              invitedAt,
              acceptedAt,
              createdAt,
              leases:Lease(
                unit:Unit(
                  property:Property(name, ownerId)
                )
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit)
        ])

        // Process activities (same logic as useActivityFeed)
        if (propertiesResult.status === 'fulfilled' && propertiesResult.value.data) {
          propertiesResult.value.data.forEach((property: unknown) => {
            activities.push({
              id: `property-${property.id}`,
              userId: property.ownerId,
              userName: user.name || '',
              action: 'Created property',
              entityType: 'property',
              entityId: property.id,
              entityName: property.name,
              createdAt: typeof property.createdAt === 'string' ? property.createdAt : property.createdAt.toISOString(),
              priority: 'medium'
            })
          })
        }

        if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.data) {
          maintenanceResult.value.data
            .filter((req: unknown) => req.unit?.property?.ownerId === user.id)
            .forEach((request: unknown) => {
              const priorityMap: Record<string, 'low' | 'medium' | 'high'> = { 
                'LOW': 'low', 
                'MEDIUM': 'medium', 
                'HIGH': 'high', 
                'EMERGENCY': 'high' 
              }
              activities.push({
                id: `maintenance-${request.id}`,
                userId: user.id,
                userName: user.name || '',
                action: `${request.status === 'COMPLETED' ? 'Completed' : 'Created'} maintenance request`,
                entityType: 'maintenance',
                entityId: request.id,
                entityName: request.title,
                metadata: { 
                  propertyName: request.unit?.property?.name,
                  unitNumber: request.unit?.unitNumber,
                  priority: request.priority,
                  status: request.status
                },
                createdAt: typeof request.createdAt === 'string' ? request.createdAt : request.createdAt.toISOString(),
                priority: priorityMap[request.priority] || 'medium'
              })
            })
        }

        if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data) {
          paymentsResult.value.data
            .filter((payment: unknown) => payment.lease?.unit?.property?.ownerId === user.id)
            .forEach((payment: unknown) => {
              activities.push({
                id: `payment-${payment.id}`,
                userId: user.id,
                userName: user.name || '',
                action: `${payment.status === 'COMPLETED' ? 'Received' : 'Recorded'} ${payment.type.toLowerCase()} payment`,
                entityType: 'payment',
                entityId: payment.id,
                entityName: `$${payment.amount}`,
                metadata: {
                  amount: payment.amount,
                  type: payment.type,
                  status: payment.status,
                  propertyName: payment.lease?.unit?.property?.name,
                  unitNumber: payment.lease?.unit?.unitNumber
                },
                createdAt: typeof payment.createdAt === 'string' ? payment.createdAt : payment.createdAt.toISOString(),
                priority: payment.status === 'FAILED' ? 'high' : 'medium'
              })
            })
        }

        if (leasesResult.status === 'fulfilled' && leasesResult.value.data) {
          leasesResult.value.data
            .filter((lease: unknown) => lease.unit?.property?.ownerId === user.id)
            .forEach((lease: unknown) => {
              const isNewLease = new Date(lease.createdAt).getTime() === new Date(lease.startDate).getTime()
              activities.push({
                id: `lease-${lease.id}`,
                userId: user.id,
                userName: user.name || '',
                action: isNewLease ? 'Created lease agreement' : `Lease status: ${lease.status.toLowerCase()}`,
                entityType: 'lease',
                entityId: lease.id,
                entityName: `Lease - ${lease.unit?.property?.name || 'Unknown Property'}`,
                metadata: {
                  propertyName: lease.unit?.property?.name,
                  unitNumber: lease.unit?.unitNumber,
                  status: lease.status,
                  startDate: lease.startDate,
                  endDate: lease.endDate
                },
                createdAt: typeof lease.createdAt === 'string' ? lease.createdAt : lease.createdAt.toISOString(),
                priority: lease.status === 'EXPIRED' ? 'high' : 'medium'
              })
            })
        }

        if (tenantsResult.status === 'fulfilled' && tenantsResult.value.data) {
          tenantsResult.value.data
            .filter((tenant: unknown) => tenant.leases?.some((lease: unknown) => lease.unit?.property?.ownerId === user.id))
            .forEach((tenant: unknown) => {
              if (tenant.acceptedAt) {
                activities.push({
                  id: `tenant-accepted-${tenant.id}`,
                  userId: user.id,
                  userName: user.name || '',
                  action: 'Tenant accepted invitation',
                  entityType: 'tenant',
                  entityId: tenant.id,
                  entityName: tenant.name,
                  metadata: {
                    invitationStatus: tenant.invitationStatus,
                    acceptedAt: tenant.acceptedAt,
                    propertyName: tenant.leases?.[0]?.unit?.property?.name
                  },
                  createdAt: typeof tenant.acceptedAt === 'string' ? tenant.acceptedAt : tenant.acceptedAt.toISOString(),
                  priority: 'medium'
                })
              } else if (tenant.invitedAt && tenant.invitationStatus === 'PENDING') {
                activities.push({
                  id: `tenant-invited-${tenant.id}`,
                  userId: user.id,
                  userName: user.name || '',
                  action: 'Sent tenant invitation',
                  entityType: 'tenant',
                  entityId: tenant.id,
                  entityName: tenant.name,
                  metadata: {
                    invitationStatus: tenant.invitationStatus,
                    invitedAt: tenant.invitedAt,
                    propertyName: tenant.leases?.[0]?.unit?.property?.name
                  },
                  createdAt: tenant.invitedAt ? (typeof tenant.invitedAt === 'string' ? tenant.invitedAt : tenant.invitedAt.toISOString()) : new Date().toISOString(),
                  priority: 'low'
                })
              }
            })
        }

      } catch (error) {
        console.error('Error fetching activity feed:', error)
        return []
      }

      return activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
    },
    enabled: !!user?.id,
  })

  // Real-time subscription setup
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user?.id) return

    console.log('🔄 Setting up real-time activity subscriptions...')

    // Property changes
    const propertyChannel = supabase
      .channel('property_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'Property', filter: `ownerId=eq.${user.id}` },
        (payload) => {
          console.log('🏠 Property change detected:', payload)
          const newActivity: RealtimeActivity = {
            id: `property-${payload.new?.id || payload.old?.id}-${Date.now()}`,
            userId: user.id,
            userName: user.name || '',
            action: payload.eventType === 'INSERT' ? 'Created property' : 
                   payload.eventType === 'UPDATE' ? 'Updated property' : 'Deleted property',
            entityType: 'property',
            entityId: payload.new?.id || payload.old?.id,
            entityName: payload.new?.name || payload.old?.name,
            createdAt: new Date().toISOString(),
            priority: 'medium',
            isNew: true,
            timestamp: Date.now()
          }
          
          setRealtimeActivities(prev => [newActivity, ...prev.slice(0, limit - 1)])
          
          // Invalidate property queries to update stats
          queryClient.invalidateQueries({ queryKey: ['properties'] })
        }
      )
      .subscribe()

    // Maintenance request changes
    const maintenanceChannel = supabase
      .channel('maintenance_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'MaintenanceRequest' },
        (payload) => {
          console.log('🔧 Maintenance change detected:', payload)
          const priorityMap: Record<string, 'low' | 'medium' | 'high'> = { 
            'LOW': 'low', 
            'MEDIUM': 'medium', 
            'HIGH': 'high', 
            'EMERGENCY': 'high' 
          }
          
          const newActivity: RealtimeActivity = {
            id: `maintenance-${payload.new?.id || payload.old?.id}-${Date.now()}`,
            userId: user.id,
            userName: user.name || '',
            action: payload.eventType === 'INSERT' ? 'Created maintenance request' : 
                   payload.eventType === 'UPDATE' ? 'Updated maintenance request' : 'Deleted maintenance request',
            entityType: 'maintenance',
            entityId: payload.new?.id || payload.old?.id,
            entityName: payload.new?.title || payload.old?.title,
            metadata: {
              priority: payload.new?.priority || payload.old?.priority,
              status: payload.new?.status || payload.old?.status
            },
            createdAt: new Date().toISOString(),
            priority: priorityMap[payload.new?.priority || payload.old?.priority] || 'medium',
            isNew: true,
            timestamp: Date.now()
          }
          
          setRealtimeActivities(prev => [newActivity, ...prev.slice(0, limit - 1)])
          
          // Invalidate maintenance queries
          queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] })
        }
      )
      .subscribe()

    // Payment changes
    const paymentChannel = supabase
      .channel('payment_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'Payment' },
        (payload) => {
          console.log('💰 Payment change detected:', payload)
          const newActivity: RealtimeActivity = {
            id: `payment-${payload.new?.id || payload.old?.id}-${Date.now()}`,
            userId: user.id,
            userName: user.name || '',
            action: payload.eventType === 'INSERT' ? `Recorded ${payload.new?.type?.toLowerCase()} payment` : 
                   payload.eventType === 'UPDATE' ? `Updated payment status` : 'Deleted payment',
            entityType: 'payment',
            entityId: payload.new?.id || payload.old?.id,
            entityName: `$${payload.new?.amount || payload.old?.amount}`,
            metadata: {
              amount: payload.new?.amount || payload.old?.amount,
              type: payload.new?.type || payload.old?.type,
              status: payload.new?.status || payload.old?.status
            },
            createdAt: new Date().toISOString(),
            priority: (payload.new?.status || payload.old?.status) === 'FAILED' ? 'high' : 'medium',
            isNew: true,
            timestamp: Date.now()
          }
          
          setRealtimeActivities(prev => [newActivity, ...prev.slice(0, limit - 1)])
          
          // Invalidate payment queries
          queryClient.invalidateQueries({ queryKey: ['payments'] })
        }
      )
      .subscribe()

    // Tenant changes
    const tenantChannel = supabase
      .channel('tenant_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'Tenant' },
        (payload) => {
          console.log('👤 Tenant change detected:', payload)
          const newActivity: RealtimeActivity = {
            id: `tenant-${payload.new?.id || payload.old?.id}-${Date.now()}`,
            userId: user.id,
            userName: user.name || '',
            action: payload.eventType === 'INSERT' ? 'Invited new tenant' : 
                   payload.eventType === 'UPDATE' && payload.new?.acceptedAt ? 'Tenant accepted invitation' :
                   payload.eventType === 'UPDATE' ? 'Updated tenant information' : 'Removed tenant',
            entityType: 'tenant',
            entityId: payload.new?.id || payload.old?.id,
            entityName: payload.new?.name || payload.old?.name,
            metadata: {
              invitationStatus: payload.new?.invitationStatus || payload.old?.invitationStatus,
              acceptedAt: payload.new?.acceptedAt || payload.old?.acceptedAt
            },
            createdAt: new Date().toISOString(),
            priority: 'medium',
            isNew: true,
            timestamp: Date.now()
          }
          
          setRealtimeActivities(prev => [newActivity, ...prev.slice(0, limit - 1)])
          
          // Invalidate tenant queries
          queryClient.invalidateQueries({ queryKey: ['tenants'] })
        }
      )
      .subscribe()

    setIsConnected(true)

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up real-time subscriptions...')
      propertyChannel.unsubscribe()
      maintenanceChannel.unsubscribe()
      paymentChannel.unsubscribe()
      tenantChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [user?.id, user?.name, limit, queryClient])

  // Setup and cleanup subscriptions
  useEffect(() => {
    if (!user?.id) return

    const cleanup = setupRealtimeSubscriptions()
    return cleanup
  }, [setupRealtimeSubscriptions, user?.id])

  // Auto-clear "new" flags after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setRealtimeActivities(prev => 
        prev.map(activity => ({
          ...activity,
          isNew: false
        }))
      )
    }, 5000)

    return () => clearTimeout(timer)
  }, [realtimeActivities])

  // Combine initial data with real-time updates
  const combinedActivities = [
    ...realtimeActivities,
    ...(initialData || [])
  ]
    .filter((activity, index, arr) => 
      // Remove duplicates based on entityType + entityId
      arr.findIndex(a => a.entityType === activity.entityType && a.entityId === activity.entityId) === index
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return {
    data: combinedActivities,
    isLoading,
    error,
    isConnected,
    hasRealtimeUpdates: realtimeActivities.length > 0
  }
}