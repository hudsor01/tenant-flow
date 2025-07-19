/**
 * Notification types and interfaces
 * Centralized types for the entire notification system
 */

// Define Priority type locally until module resolution is fixed
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'

export type NotificationType = 
  | 'maintenance_request_created'
  | 'maintenance_request_created_emergency'
  | 'maintenance_request_created_high'
  | 'maintenance_request_created_medium'
  | 'maintenance_request_created_low'
  | 'maintenance_update'
  | 'maintenance_update_emergency'
  | 'maintenance_update_high'
  | 'maintenance_update_medium'
  | 'maintenance_update_low'
  | 'lease_expiring'
  | 'payment_due'
  | 'property_update'
  | 'tenant_message'
  | 'system_alert'

export interface NotificationData {
  recipientId: string
  title: string
  message: string
  type: NotificationType
  priority: Priority
  actionUrl?: string
  propertyId?: string
  tenantId?: string
  leaseId?: string
  maintenanceId?: string
  data?: Record<string, unknown>
}

export interface MaintenanceNotificationData extends NotificationData {
  type: NotificationType
  maintenanceId?: string
  data?: {
    propertyName: string
    unitNumber: string
    description: string
    requestTitle: string
    category?: string
    estimatedCost?: number
    [key: string]: unknown
  }
}

export interface NotificationResponse {
  id: string
  sent: boolean
  sentAt: string
  error?: string
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  inApp: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly'
  maintenanceAlerts: boolean
  paymentReminders: boolean
  leaseExpiration: boolean
  systemUpdates: boolean
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  subject: string
  body: string
  variables: string[]
  priority: Priority
}