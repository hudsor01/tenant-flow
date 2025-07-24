/**
 * Notification constants and configuration
 * Centralized constants for the notification system
 */

import type { Priority } from '@/services/notifications/types'

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH',
  EMERGENCY: 'EMERGENCY'
} as const

export const PRIORITY_LABELS: Record<Priority, string> = {
  EMERGENCY: 'EMERGENCY',
  HIGH: 'High Priority',
  MEDIUM: 'Medium Priority',
  LOW: 'Low Priority'
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  EMERGENCY: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800'
}

export const NOTIFICATION_TYPES = {
  MAINTENANCE_REQUEST_CREATED: 'maintenance_request_created',
  MAINTENANCE_REQUEST_CREATED_EMERGENCY: 'maintenance_request_created_emergency',
  MAINTENANCE_REQUEST_CREATED_HIGH: 'maintenance_request_created_high',
  MAINTENANCE_REQUEST_CREATED_MEDIUM: 'maintenance_request_created_medium',
  MAINTENANCE_REQUEST_CREATED_LOW: 'maintenance_request_created_low',
  MAINTENANCE_UPDATE: 'maintenance_update',
  MAINTENANCE_UPDATE_EMERGENCY: 'maintenance_update_emergency',
  MAINTENANCE_UPDATE_HIGH: 'maintenance_update_high',
  MAINTENANCE_UPDATE_MEDIUM: 'maintenance_update_medium',
  MAINTENANCE_UPDATE_LOW: 'maintenance_update_low',
  LEASE_EXPIRING: 'lease_expiring',
  PAYMENT_DUE: 'payment_due',
  PROPERTY_UPDATE: 'property_update',
  TENANT_MESSAGE: 'tenant_message',
  SYSTEM_ALERT: 'system_alert'
} as const

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
} as const

export const NOTIFICATION_FREQUENCIES = {
  IMMEDIATE: 'immediate',
  DAILY: 'daily',
  WEEKLY: 'weekly'
} as const

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email: true,
  sms: false,
  push: true,
  inApp: true,
  emailFrequency: 'immediate' as const,
  maintenanceAlerts: true,
  paymentReminders: true,
  leaseExpiration: true,
  systemUpdates: true
}

export const NOTIFICATION_TIMEOUTS = {
  DEFAULT: 8000,
  HIGH_PRIORITY: 12000,
  EMERGENCY: 15000
}

export const RETRY_CONFIGURATIONS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2
}