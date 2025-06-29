import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logger } from '@/lib/logger'
// Removed unused Notification import - using NotificationWithRelations instead
import type { NotificationWithRelations } from '@/types/relationships'

type NotificationType = 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Get notifications for the current user
export function useNotifications(limit?: number) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      let query = supabase
        .from('Notification')
        .select(`
          *,
          property:Property (
            id, name, address, city, state, zipCode, description, imageUrl, ownerId, createdAt, updatedAt
          ),
          tenant:Tenant (
            id, name, email, phone, createdAt, updatedAt, userId, emergencyContact,
            invitationStatus, invitationToken, invitedBy, invitedAt, acceptedAt, expiresAt
          ),
          maintenance:MaintenanceRequest (
            id, title, description, priority, status, createdAt, updatedAt,
            unit:Unit (
              unitNumber,
              property:Property (name)
            )
          ),
          payment:Payment (
            id, amount, date, status, type, leaseId, notes, createdAt, updatedAt
          ),
          lease:Lease (
            id, startDate, endDate, status, createdAt, updatedAt,
            unit:Unit (
              id, unitNumber,
              property:Property (id, name, address, city, state, zipCode, description, imageUrl, ownerId, createdAt, updatedAt)
            )
          )
        `)
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data: notificationsData, error } = await query

      if (error) {
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }

      if (!notificationsData || notificationsData.length === 0) return []

      // Transform the data, ensuring Date objects are correctly instantiated
      // and related entities are structured as expected by NotificationWithRelations.
      const enrichedNotifications = notificationsData.map((n): NotificationWithRelations => {
        return {
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          property: n.property ? {
            ...n.property,
            createdAt: n.property.createdAt ? new Date(n.property.createdAt) : new Date(),
            updatedAt: n.property.updatedAt ? new Date(n.property.updatedAt) : new Date(),
          } : null,
          tenant: n.tenant ? {
            ...n.tenant,
            createdAt: n.tenant.createdAt ? new Date(n.tenant.createdAt) : new Date(),
            updatedAt: n.tenant.updatedAt ? new Date(n.tenant.updatedAt) : new Date(),
            invitedAt: n.tenant.invitedAt ? new Date(n.tenant.invitedAt) : null,
            acceptedAt: n.tenant.acceptedAt ? new Date(n.tenant.acceptedAt) : null,
            expiresAt: n.tenant.expiresAt ? new Date(n.tenant.expiresAt) : null,
          } : null,
          maintenance: n.maintenance ? {
            ...n.maintenance,
            createdAt: n.maintenance.createdAt ? new Date(n.maintenance.createdAt) : new Date(),
            updatedAt: n.maintenance.updatedAt ? new Date(n.maintenance.updatedAt) : new Date(),
            // unit and property within maintenance are already selected and part of n.maintenance
          } : null,
          payment: n.payment ? {
            ...n.payment,
            date: n.payment.date ? new Date(n.payment.date) : null, // Assuming 'date' can be null
            createdAt: n.payment.createdAt ? new Date(n.payment.createdAt) : new Date(),
            updatedAt: n.payment.updatedAt ? new Date(n.payment.updatedAt) : new Date(),
          } : null,
          lease: n.lease ? {
            ...n.lease,
            startDate: n.lease.startDate ? new Date(n.lease.startDate) : null,
            endDate: n.lease.endDate ? new Date(n.lease.endDate) : null,
            createdAt: n.lease.createdAt ? new Date(n.lease.createdAt) : new Date(),
            updatedAt: n.lease.updatedAt ? new Date(n.lease.updatedAt) : new Date(),
            unit: n.lease.unit ? {
              ...n.lease.unit,
              property: n.lease.unit.property ? {
                ...n.lease.unit.property,
                createdAt: n.lease.unit.property.createdAt ? new Date(n.lease.unit.property.createdAt) : new Date(),
                updatedAt: n.lease.unit.property.updatedAt ? new Date(n.lease.unit.property.updatedAt) : new Date(),
              } : null,
            } : null,
          } : null,
        }
      })

      return enrichedNotifications;
    },
    enabled: !!user?.id,
  })

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return

    logger.info('Setting up real-time subscription for notifications', undefined, { userId: user.id })

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'Notification',
          filter: `userId=eq.${user.id}`
        }, 
        (payload) => {
          logger.debug('Notification real-time change detected', undefined, { 
            eventType: payload.eventType, 
            recordId: payload.new?.id || payload.old?.id,
            notificationType: payload.new?.type || payload.old?.type
          })

          // Invalidate and refetch notifications queries to get fresh data with relations
          queryClient.invalidateQueries({ 
            queryKey: ['notifications', user.id] 
          })
          // Also invalidate unread count
          queryClient.invalidateQueries({ 
            queryKey: ['notifications', 'unread-count', user.id] 
          })
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription for notifications', undefined, { userId: user.id })
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return query
}

// Get unread notifications count
export function useUnreadNotificationsCount(options?: { enabled?: boolean }) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { count, error } = await supabase
        .from('Notification')
        .select('*', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('read', false)

      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id && (options?.enabled !== false),
  })
}

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('Notification')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('userId', user.id) // Security check

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('Notification')
        .update({ read: true })
        .eq('userId', user.id)
        .eq('read', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('Notification')
        .delete()
        .eq('id', notificationId)
        .eq('userId', user.id) // Security check

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Delete all read notifications
export function useDeleteAllReadNotifications() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('Notification')
        .delete()
        .eq('userId', user.id)
        .eq('read', true)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Create notification (for system events)
export interface CreateNotificationData {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  userId: string
  propertyId?: string
  tenantId?: string
  leaseId?: string
  paymentId?: string
  maintenanceId?: string
  actionUrl?: string
  data?: string
}

export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      const { data: notification, error } = await supabase
        .from('Notification')
        .insert({
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority || 'MEDIUM',
          userId: data.userId,
          propertyId: data.propertyId,
          tenantId: data.tenantId,
          leaseId: data.leaseId,
          paymentId: data.paymentId,
          maintenanceId: data.maintenanceId,
          actionUrl: data.actionUrl,
          data: data.data,
        })
        .select()
        .single()

      if (error) throw error
      return notification
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
