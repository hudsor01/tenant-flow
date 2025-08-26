/**
 * Notification API service
 * Handles all notification API calls and communication with backend
 */

import { apiClient } from '../api-client'
import type { 
	NotificationData, 
	NotificationRequest, 
	NotificationResponse
} from '@repo/shared/types/notifications'
import { NotificationType } from '@repo/shared/types/notifications'
import type { MaintenancePriority as Priority } from '@repo/shared'

export class NotificationApiService {
  private retryCount = 3
  private retryDelay = 1000

  /**
   * Send a notification via backend API
   */
  async send(notificationData: NotificationRequest): Promise<NotificationResponse> {
    const payload: NotificationRequest = {
      recipientId: notificationData.recipientId,
      title: notificationData.title || '',
      message: notificationData.message || '',
      type: notificationData.type || NotificationType.INFO,
      priority: notificationData.priority,
      actionUrl: notificationData.actionUrl,
      data: notificationData.data
    }

    const result = await apiClient.post<{ id?: string; success?: boolean }>('/notifications', payload)

    return {
      id: result?.id || `notification_${Date.now()}`,
      sent: true,
      sentAt: new Date().toISOString()
    }
  }

  /**
   * Send maintenance notification
   */
  async sendMaintenanceNotification(data: NotificationRequest): Promise<NotificationResponse> {
    return this.send(data)
  }

  /**
   * Get notifications for current user
   */
  async getNotifications(params?: {
    unreadOnly?: boolean
    priority?: Priority
  }): Promise<NotificationData[]> {
    const searchParams = new URLSearchParams()

    if (params?.unreadOnly) {
      searchParams.append('unreadOnly', 'true')
    }

    if (params?.priority) {
      searchParams.append('priority', params.priority)
    }

    const url = `/notifications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return apiClient.get<NotificationData[]>(url)
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.put<void>(`/notifications/${notificationId}/read`)
  }

  /**
   * Create maintenance notification - convenience method
   */
  async createMaintenanceNotification(
    ownerId: string,
    title: string,
    description: string,
    priority: Priority,
    propertyName: string,
    unitNumber: string,
    maintenanceId?: string,
    actionUrl?: string
  ): Promise<NotificationResponse> {
    // Map backend-specific event to a neutral frontend type
    return this.send({
      recipientId: ownerId,
      title,
      message: description,
      priority,
      // Use a valid NotificationType enum value
      type: NotificationType.MAINTENANCE,
      actionUrl,
      data: {
        propertyName,
        unitNumber,
        maintenanceId,
        requestTitle: title
      }
    })
  }

  /**
   * Get priority information from backend
   */
  async getPriorityInfo(priority: Priority): Promise<{
    label: string
    urgent: boolean
    timeout: number
    sendImmediately: boolean
  }> {
    return apiClient.get(`/notifications/priority-info/${priority}`)
  }
}

// Export singleton instance
export const notificationApi = new NotificationApiService()
