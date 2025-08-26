/**
 * Notification API service
 * Handles all notification API calls and communication with backend
 */

import { apiClient } from '../api-client'
<<<<<<< HEAD
import type {
	NotificationData,
	NotificationRequest,
	NotificationResponse
} from '@repo/shared'
import { NotificationType } from '@repo/shared'
import type { MaintenancePriority as Priority } from '@repo/shared'

export class NotificationApiService {
	private retryCount = 3
	private retryDelay = 1000

	/**
	 * Send a notification via backend API
	 */
	async send(
		notificationData: NotificationRequest
	): Promise<NotificationResponse> {
		const payload: NotificationRequest = {
			recipientId: notificationData.recipientId,
			title: notificationData.title || '',
			message: notificationData.message || '',
			type: notificationData.type || NotificationType.INFO,
			priority: notificationData.priority,
			actionUrl: notificationData.actionUrl,
			data: notificationData.data
		}

		const result = await apiClient.post<{ id?: string; success?: boolean }>(
			'/notifications',
			payload
		)

		return {
			id: result?.id || `notification_${Date.now()}`,
			sent: true,
			sentAt: new Date().toISOString()
		}
	}

	/**
	 * Send maintenance notification
	 */
	async sendMaintenanceNotification(
		data: NotificationRequest
	): Promise<NotificationResponse> {
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
=======
import type { NotificationData, CreateNotificationDto, Priority } from '../../services/notifications/types'
import type { NotificationType } from '@repo/shared/types/notifications'

/**
 * Local request/response shapes to bridge differences between frontend types and backend API.
 */
type NotificationRequest = Partial<CreateNotificationDto> & {
  recipientId?: string
  actionUrl?: string
  data?: Record<string, unknown>
  // backend may accept additional fields; keep flexible
}

interface NotificationResponse {
  id: string
  sent: boolean
  sentAt: string
}

export class NotificationApiService {
  private retryCount = 3
  private retryDelay = 1000

  /**
   * Send a notification via backend API
   */
  async send(notificationData: NotificationRequest): Promise<NotificationResponse> {
    const payload = {
      recipientId: notificationData.recipientId,
      title: notificationData.title,
      message: notificationData.message || '',
      // backend may accept arbitrary type strings; default to INFO for frontend compatibility
      type: ('type' in notificationData && typeof notificationData.type === 'string' 
        ? notificationData.type 
        : 'INFO') as NotificationType,
      priority: notificationData.priority,
      actionUrl: notificationData.actionUrl,
      data: notificationData.data
    }

    interface NotificationResponse {
      id?: string
      success?: boolean
      [key: string]: unknown
    }
    const result = await apiClient.post<NotificationResponse>('/notifications', payload)

    return {
      id: (result && (result.id as string)) || `notification_${Date.now()}`,
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
      // Use a frontend-compatible type value; backend can interpret via 'data' if needed
      type: 'INFO',
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
>>>>>>> origin/main
}

// Export singleton instance
export const notificationApi = new NotificationApiService()
