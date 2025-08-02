/**
 * Notification utility functions
 * Helper functions for notification processing and formatting
 */

import type { Priority, NotificationType, MaintenanceNotificationData } from '@/services/notifications/types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/services/notifications/constants'

/**
 * Get notification type based on maintenance priority and urgency
 */
export function getNotificationType(priority: Priority, isNewRequest = false): NotificationType {
  const baseType = isNewRequest ? 'maintenance_request_created' : 'maintenance_update'
  
  switch (priority) {
    case 'EMERGENCY':
      return `${baseType}_emergency` as NotificationType
    case 'HIGH':
      return `${baseType}_high` as NotificationType
    case 'MEDIUM':
      return `${baseType}_medium` as NotificationType
    case 'LOW':
      return `${baseType}_low` as NotificationType
    default:
      return baseType as NotificationType
  }
}

/**
 * Get priority label for display
 */
export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] || priority
}

/**
 * Get priority color classes for UI
 */
export function getPriorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-800'
}

/**
 * Get notification priority level for UI display
 */
export function getNotificationPriorityLevel(priority: Priority): 'low' | 'medium' | 'high' | 'emergency' {
  switch (priority) {
    case 'EMERGENCY':
      return 'emergency'
    case 'HIGH':
      return 'high'
    case 'MEDIUM':
      return 'medium'
    case 'LOW':
      return 'low'
    default:
      return 'medium'
  }
}

/**
 * Get notification urgency for system processing
 */
export function getNotificationUrgency(priority: Priority): boolean {
  return priority === 'EMERGENCY' || priority === 'HIGH'
}

/**
 * Create maintenance notification data for property owner
 */
export function createMaintenanceNotification(
  ownerId: string,
  title: string,
  description: string,
  priority: Priority,
  propertyName: string,
  unitNumber: string,
  maintenanceId?: string,
  actionUrl?: string
): MaintenanceNotificationData {
  const priorityLabel = getPriorityLabel(priority)

  return {
    recipientId: ownerId,
    title: `${priorityLabel} Maintenance Request`,
    message: `New maintenance request for ${propertyName} - Unit ${unitNumber}: ${title}`,
    type: getNotificationType(priority, true),
    priority: priority,
    actionUrl: actionUrl || '/maintenance',
    maintenanceId: maintenanceId,
    data: {
      propertyName,
      unitNumber,
      description: description.substring(0, 200), // Truncate for notification
      requestTitle: title
    }
  }
}

/**
 * Format notification message with variables
 */
export function formatNotificationMessage(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() || match
  })
}

/**
 * Generate notification ID
 */
export function generateNotificationId(): string {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate notification data
 */
export function validateNotificationData(data: Partial<MaintenanceNotificationData>): string[] {
  const errors: string[] = []

  if (!data.recipientId) {
    errors.push('Recipient ID is required')
  }

  if (!data.title) {
    errors.push('Title is required')
  }

  if (!data.message) {
    errors.push('Message is required')
  }

  if (!data.type) {
    errors.push('Notification type is required')
  }

  if (!data.priority) {
    errors.push('Priority is required')
  }

  return errors
}

/**
 * Calculate notification timeout based on priority
 */
export function getNotificationTimeout(priority: Priority): number {
  switch (priority) {
    case 'EMERGENCY':
      return 15000
    case 'HIGH':
      return 12000
    case 'MEDIUM':
      return 8000
    case 'LOW':
      return 5000
    default:
      return 8000
  }
}

/**
 * Determine if notification should be sent immediately
 */
export function shouldSendImmediately(priority: Priority): boolean {
  return priority === 'EMERGENCY' || priority === 'HIGH'
}

/**
 * Get notification display icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  if (type.includes('maintenance')) {
    return '🔧'
  }
  if (type.includes('lease')) {
    return '📋'
  }
  if (type.includes('payment')) {
    return '💰'
  }
  if (type.includes('property')) {
    return '🏠'
  }
  if (type.includes('tenant')) {
    return '👤'
  }
  return '📨'
}