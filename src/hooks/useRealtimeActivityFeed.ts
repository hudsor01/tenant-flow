import { useEffect, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logger } from '@/lib/logger'
import type { Activity } from './useActivityFeed'

interface RealtimeActivity extends Activity {
  isNew?: boolean
  timestamp?: number
}

// Safe version that fetches activity data in separate steps to avoid circular RLS dependencies
export function useRealtimeActivityFeed(limit = 10) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [realtimeActivities, setRealtimeActivities] = useState<RealtimeActivity[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Base query for initial data load - using safe approach
  const { data: initialData = [], isLoading, error } = useQuery({
    queryKey: ['activityFeed', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []

      const activities: Activity[] = []
      const batchLimit = Math.ceil(limit / 5)

      try {
        // Step 1: Get basic data from each table separately (no joins)
        const [
          propertiesResult,
          maintenanceResult,
          paymentsResult,
          leasesResult,
          tenantsResult
        ] = await Promise.allSettled([
          // Properties - simple query
          supabase
            .from('Property')
            .select('id, name, createdAt, ownerId')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Maintenance requests - will be filtered by RLS
          supabase
            .from('MaintenanceRequest')
            .select('id, title, priority, status, createdAt, ownerId')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Payments - will be filtered by RLS
          supabase
            .from('Payment')
            .select('id, amount, date, type, status, createdAt, ownerId')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Leases - no ownerId column, will be filtered by RLS
          supabase
            .from('Lease')
            .select('id, startDate, endDate, rentAmount, status, createdAt')
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Tenants - using userId not ownerId
          supabase
            .from('Tenant')
            .select('id, name, email, invitationStatus, createdAt, userId')
            .eq('userId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit)
        ])

        // Step 2: Process results safely
        if (propertiesResult.status === 'fulfilled' && propertiesResult.value.data) {
          propertiesResult.value.data.forEach(property => {
            activities.push({
              id: `property-${property.id}`,
              type: 'property',
              title: `New property added: ${property.name}`,
              description: `Property "${property.name}" was added to your portfolio`,
              timestamp: new Date(property.createdAt),
              metadata: { propertyId: property.id, propertyName: property.name },
              severity: 'info',
              actor: { name: user.name || 'You' }
            })
          })
        }

        if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.data) {
          maintenanceResult.value.data.forEach(request => {
            activities.push({
              id: `maintenance-${request.id}`,
              type: 'maintenance',
              title: `Maintenance request: ${request.title}`,
              description: `${request.priority} priority ${request.status.toLowerCase()} request`,
              timestamp: new Date(request.createdAt),
              metadata: { requestId: request.id, priority: request.priority, status: request.status },
              severity: request.priority === 'HIGH' || request.priority === 'EMERGENCY' ? 'high' : 'info',
              actor: { name: 'Tenant' }
            })
          })
        }

        if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data) {
          paymentsResult.value.data.forEach(payment => {
            activities.push({
              id: `payment-${payment.id}`,
              type: 'payment',
              title: `Payment ${payment.status.toLowerCase()}: $${payment.amount}`,
              description: `${payment.type} payment of $${payment.amount}`,
              timestamp: new Date(payment.date || payment.createdAt),
              metadata: { paymentId: payment.id, amount: payment.amount, type: payment.type },
              severity: payment.status === 'FAILED' ? 'high' : 'info',
              actor: { name: 'Tenant' }
            })
          })
        }

        if (leasesResult.status === 'fulfilled' && leasesResult.value.data) {
          leasesResult.value.data.forEach(lease => {
            activities.push({
              id: `lease-${lease.id}`,
              type: 'lease',
              title: `Lease ${lease.status.toLowerCase()}`,
              description: `Lease for $${lease.rentAmount}/month`,
              timestamp: new Date(lease.startDate || lease.createdAt),
              metadata: { leaseId: lease.id, rentAmount: lease.rentAmount, status: lease.status },
              severity: 'info',
              actor: { name: 'Tenant' }
            })
          })
        }

        if (tenantsResult.status === 'fulfilled' && tenantsResult.value.data) {
          tenantsResult.value.data.forEach(tenant => {
            activities.push({
              id: `tenant-${tenant.id}`,
              type: 'tenant',
              title: `Tenant ${tenant.invitationStatus.toLowerCase()}: ${tenant.name}`,
              description: `${tenant.name} (${tenant.email})`,
              timestamp: new Date(tenant.createdAt),
              metadata: { tenantId: tenant.id, tenantName: tenant.name, status: tenant.invitationStatus },
              severity: 'info',
              actor: { name: tenant.name }
            })
          })
        }

        // Step 3: Sort by timestamp and limit results
        return activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, limit)

      } catch (error) {
        logger.error('Failed to fetch activity feed', error as Error)
        return []
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  })

  // Real-time subscription setup
  useEffect(() => {
    if (!user?.id) return

    logger.info('Setting up real-time activity feed subscription', undefined, { userId: user.id })

    const channels = [
      // Property changes
      supabase
        .channel('properties-activity')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Property',
          filter: `ownerId=eq.${user.id}`
        }, handleRealtimeChange),

      // Maintenance request changes
      supabase
        .channel('maintenance-activity')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'MaintenanceRequest',
          filter: `ownerId=eq.${user.id}`
        }, handleRealtimeChange),

      // Payment changes
      supabase
        .channel('payments-activity')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Payment',
          filter: `ownerId=eq.${user.id}`
        }, handleRealtimeChange),

      // Lease changes - no filter since Lease doesn't have ownerId, rely on RLS
      supabase
        .channel('leases-activity')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Lease'
        }, handleRealtimeChange),

      // Tenant changes - using userId filter
      supabase
        .channel('tenants-activity')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'Tenant',
          filter: `userId=eq.${user.id}`
        }, handleRealtimeChange)
    ]

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe())
    setIsConnected(true)

    return () => {
      logger.debug('Cleaning up real-time activity feed subscriptions', undefined, { userId: user.id })
      channels.forEach(channel => supabase.removeChannel(channel))
      setIsConnected(false)
    }
  }, [user?.id, handleRealtimeChange])

  const handleRealtimeChange = useCallback((payload: { table: string; eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
    logger.debug('Real-time activity change detected', undefined, {
      table: payload.table,
      eventType: payload.eventType,
      recordId: payload.new?.id || payload.old?.id
    })

    // Create activity from the change
    const record = payload.new || payload.old
    if (!record) return

    let activity: RealtimeActivity | null = null

    switch (payload.table) {
      case 'Property':
        if (payload.eventType === 'INSERT') {
          activity = {
            id: `property-${record.id}-${Date.now()}`,
            type: 'property',
            title: `New property added: ${record.name}`,
            description: `Property "${record.name}" was added to your portfolio`,
            timestamp: new Date(),
            metadata: { propertyId: record.id, propertyName: record.name },
            severity: 'info',
            actor: { name: user?.name || 'You' },
            isNew: true
          }
        }
        break

      case 'MaintenanceRequest':
        activity = {
          id: `maintenance-${record.id}-${Date.now()}`,
          type: 'maintenance',
          title: `Maintenance ${payload.eventType.toLowerCase()}: ${record.title}`,
          description: `${record.priority} priority request`,
          timestamp: new Date(),
          metadata: { requestId: record.id, priority: record.priority },
          severity: record.priority === 'HIGH' || record.priority === 'EMERGENCY' ? 'high' : 'info',
          actor: { name: 'Tenant' },
          isNew: true
        }
        break

      case 'Payment':
        activity = {
          id: `payment-${record.id}-${Date.now()}`,
          type: 'payment',
          title: `Payment ${record.status?.toLowerCase()}: $${record.amount}`,
          description: `${record.type} payment`,
          timestamp: new Date(),
          metadata: { paymentId: record.id, amount: record.amount },
          severity: record.status === 'FAILED' ? 'high' : 'info',
          actor: { name: 'Tenant' },
          isNew: true
        }
        break

      case 'Lease':
        activity = {
          id: `lease-${record.id}-${Date.now()}`,
          type: 'lease',
          title: `Lease ${payload.eventType.toLowerCase()}`,
          description: `$${record.rentAmount}/month lease`,
          timestamp: new Date(),
          metadata: { leaseId: record.id, rentAmount: record.rentAmount },
          severity: 'info',
          actor: { name: 'Tenant' },
          isNew: true
        }
        break

      case 'Tenant':
        activity = {
          id: `tenant-${record.id}-${Date.now()}`,
          type: 'tenant',
          title: `Tenant ${payload.eventType.toLowerCase()}: ${record.name}`,
          description: record.email,
          timestamp: new Date(),
          metadata: { tenantId: record.id, tenantName: record.name },
          severity: 'info',
          actor: { name: record.name },
          isNew: true
        }
        break
    }

    if (activity) {
      setRealtimeActivities(prev => [activity!, ...prev.slice(0, 9)])
      
      // Auto-remove the 'new' flag after 5 seconds
      setTimeout(() => {
        setRealtimeActivities(prev => 
          prev.map(item => 
            item.id === activity!.id 
              ? { ...item, isNew: false }
              : item
          )
        )
      }, 5000)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] })
    }
  }, [user?.name, queryClient])

  // Combine initial data with real-time activities
  const combinedActivities = [
    ...realtimeActivities,
    ...initialData.filter(item => 
      !realtimeActivities.some(rt => rt.id.includes(item.id))
    )
  ].slice(0, limit)

  return {
    data: combinedActivities,
    isLoading,
    error,
    isConnected,
    hasNewActivities: realtimeActivities.some(activity => activity.isNew),
    markAllAsRead: () => {
      setRealtimeActivities(prev => 
        prev.map(activity => ({ ...activity, isNew: false }))
      )
    }
  }
}