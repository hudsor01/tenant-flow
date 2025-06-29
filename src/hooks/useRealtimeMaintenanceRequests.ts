import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logger } from '@/lib/logger'
import type { MaintenanceRequest } from '@/types/entities'

interface RealtimeMaintenanceEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old?: MaintenanceRequest
  new?: MaintenanceRequest
  timestamp: number
}

/**
 * Hook for real-time maintenance request updates
 * Provides live updates when maintenance requests are created, updated, or deleted
 */
export function useRealtimeMaintenanceRequests() {
  const { user } = useAuthStore()
  const [latestEvent, setLatestEvent] = useState<RealtimeMaintenanceEvent | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    logger.info('Setting up real-time maintenance requests subscription', undefined, { userId: user.id })

    const channel = supabase
      .channel('realtime-maintenance-requests')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'MaintenanceRequest',
          filter: `ownerId=eq.${user.id}`
        }, 
        (payload) => {
          logger.debug('Real-time maintenance request change', undefined, { 
            eventType: payload.eventType, 
            recordId: payload.new?.id || payload.old?.id,
            status: payload.new?.status || payload.old?.status,
            priority: payload.new?.priority || payload.old?.priority
          })

          setLatestEvent({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            old: payload.old as MaintenanceRequest,
            new: payload.new as MaintenanceRequest,
            timestamp: Date.now()
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          logger.info('Real-time maintenance requests subscription active', undefined, { userId: user.id })
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          logger.error('Real-time maintenance requests subscription error', new Error('Channel error'), { userId: user.id })
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          logger.info('Real-time maintenance requests subscription closed', undefined, { userId: user.id })
        }
      })

    return () => {
      logger.debug('Cleaning up real-time maintenance requests subscription', undefined, { userId: user.id })
      setIsConnected(false)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return {
    latestEvent,
    isConnected,
    clearLatestEvent: () => setLatestEvent(null)
  }
}

/**
 * Hook to get maintenance request statistics in real-time
 * Useful for dashboard widgets and summary cards
 */
export function useRealtimeMaintenanceStats() {
  const { user } = useAuthStore()
  const [stats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0,
    high: 0
  })

  const { latestEvent } = useRealtimeMaintenanceRequests()

  // Recalculate stats when there's a real-time event
  useEffect(() => {
    if (!user?.id || !latestEvent) return

    // In a real implementation, you'd want to fetch the latest counts
    // Here we're just logging the event for demonstration
    logger.debug('Maintenance stats update triggered by real-time event', undefined, {
      eventType: latestEvent.eventType,
      recordId: latestEvent.new?.id || latestEvent.old?.id
    })

    // Calculate stats based on current maintenance requests data
    if (latestEvent && maintenanceRequests) {
      const requests = maintenanceRequests as MaintenanceRequestWithRelations[]
      const open = requests.filter(r => r.status === 'OPEN').length
      const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
      const urgent = requests.filter(r => r.priority === 'HIGH' || r.priority === 'EMERGENCY').length
      
      stats.openTickets = open
      stats.inProgress = inProgress
      stats.urgent = urgent
      stats.total = requests.length
    }
  }, [latestEvent, user?.id, stats])

  return stats
}