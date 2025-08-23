/**
 * Notification Types
 */

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface NotificationData {
  id: string
  title: string
  message: string
  priority: Priority
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  read: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateNotificationDto {
  title: string
  message: string
  priority?: Priority
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
}

export interface UpdateNotificationDto {
  read?: boolean
}