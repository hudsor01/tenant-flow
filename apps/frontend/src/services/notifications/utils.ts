/**
 * Notification utility functions
 */

import type { NotificationData } from './types'

/**
 * Generate a unique notification ID
 */
export function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate notification data
 */
export function validateNotificationData(data: unknown): data is NotificationData {
  if (!data || typeof data !== 'object') return false
  
  const notification = data as NotificationData
  
  return (
    typeof notification.id === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.priority === 'string' &&
    typeof notification.type === 'string' &&
    typeof notification.read === 'boolean'
  )
}