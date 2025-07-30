/**
 * Reminder types
 * Types for reminder and notification management
 */

import { REMINDER_TYPE, REMINDER_STATUS } from '../constants/reminders'

// Types derived from constants
export type ReminderType = typeof REMINDER_TYPE[keyof typeof REMINDER_TYPE]
export type ReminderStatus = typeof REMINDER_STATUS[keyof typeof REMINDER_STATUS]

// ReminderLog interface - matches Prisma schema
export interface ReminderLog {
  id: string
  leaseId: string | null
  userId: string
  type: ReminderType
  status: ReminderStatus
  recipientEmail: string
  recipientName: string | null
  subject: string | null
  content: string | null
  sentAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

// Display helpers
export const getReminderTypeLabel = (type: ReminderType): string => {
  const labels: Record<ReminderType, string> = {
    RENT_REMINDER: 'Rent Reminder',
    LEASE_EXPIRATION: 'Lease Expiration',
    MAINTENANCE_DUE: 'Maintenance Due',
    PAYMENT_OVERDUE: 'Payment Overdue'
  }
  return labels[type] || type
}

export const getReminderStatusLabel = (status: ReminderStatus): string => {
  const labels: Record<ReminderStatus, string> = {
    PENDING: 'Pending',
    SENT: 'Sent',
    FAILED: 'Failed',
    DELIVERED: 'Delivered',
    OPENED: 'Opened'
  }
  return labels[status] || status
}

export const getReminderStatusColor = (status: ReminderStatus): string => {
  const colors: Record<ReminderStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SENT: 'bg-blue-100 text-blue-800',
    FAILED: 'bg-red-100 text-red-800',
    DELIVERED: 'bg-green-100 text-green-800',
    OPENED: 'bg-purple-100 text-purple-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}