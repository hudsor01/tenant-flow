/**
 * Notification React hooks
 * React hooks for notification functionality
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { notificationApi } from '@/services/notifications/api'
import type { NotificationData, MaintenanceNotificationData } from '@/services/notifications/types'

/**
 * Hook to send notifications
 */
export function useSendNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationData: NotificationData) => {
      return notificationApi.send(notificationData)
    },
    onSuccess: (data) => {
      logger.info('Notification sent successfully', undefined, {
        notificationId: data.id,
        recipientId: data.id
      })
      
      // Invalidate notifications queries to refresh UI
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('Failed to send notification', error as Error)
    }
  })
}

/**
 * Hook specifically for maintenance notifications
 */
export function useSendMaintenanceNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationData: MaintenanceNotificationData) => {
      return notificationApi.sendMaintenanceNotification(notificationData)
    },
    onSuccess: (data) => {
      logger.info('Maintenance notification sent successfully', undefined, {
        notificationId: data.id
      })
      
      // Invalidate relevant queries
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    },
    onError: (error) => {
      logger.error('Failed to send maintenance notification', error as Error)
    }
  })
}

/**
 * Hook to send batch notifications
 */
export function useSendBatchNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notifications: NotificationData[]) => {
      return notificationApi.sendBatch(notifications)
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.sent).length
      const failedCount = results.length - successCount
      
      logger.info('Batch notifications completed', undefined, {
        total: results.length,
        successful: successCount,
        failed: failedCount
      })
      
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      logger.error('Failed to send batch notifications', error as Error)
    }
  })
}

/**
 * Hook to retry failed notifications
 */
export function useRetryNotification() {
  return useMutation({
    mutationFn: async ({ notificationData, attemptNumber }: { 
      notificationData: NotificationData
      attemptNumber?: number 
    }) => {
      return notificationApi.retry(notificationData, attemptNumber)
    },
    onSuccess: (data) => {
      logger.info('Notification retry successful', undefined, {
        notificationId: data.id
      })
    },
    onError: (error) => {
      logger.error('Notification retry failed', error as Error)
    }
  })
}