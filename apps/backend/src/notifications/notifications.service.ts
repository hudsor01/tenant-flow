import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { EmailService } from '../email/email.service'
import type { 
  MaintenanceNotificationData, 
  NotificationType,
  Priority 
} from './dto/notification.dto'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Get notification type based on maintenance priority and urgency
   */
  getNotificationType(
    priority: Priority,
    isNewRequest = false
  ): NotificationType {
    const baseType = isNewRequest
      ? 'maintenance_request_created'
      : 'maintenance_update'

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
  getPriorityLabel(priority: Priority): string {
    const labels = {
      EMERGENCY: 'Emergency',
      HIGH: 'High Priority',
      MEDIUM: 'Medium Priority',
      LOW: 'Low Priority'
    }
    return labels[priority] || priority
  }

  /**
   * Get notification urgency for system processing
   */
  getNotificationUrgency(priority: Priority): boolean {
    return priority === 'EMERGENCY' || priority === 'HIGH'
  }

  /**
   * Create and send maintenance notification
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
  ): Promise<MaintenanceNotificationData> {
    const priorityLabel = this.getPriorityLabel(priority)

    const notification: MaintenanceNotificationData = {
      recipientId: ownerId,
      title: `${priorityLabel} Maintenance Request`,
      message: `New maintenance request for ${propertyName} - Unit ${unitNumber}: ${title}`,
      type: this.getNotificationType(priority, true),
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

    // Validate notification data
    const errors = this.validateNotificationData(notification)
    if (errors.length > 0) {
      throw new Error(`Invalid notification data: ${errors.join(', ')}`)
    }

    // Store notification in database using existing InAppNotification table
    const { error } = await this.supabaseService.getAdminClient()
      .from('InAppNotification')
      .insert({
        userId: notification.recipientId,
        title: notification.title,
        content: notification.message,
        type: notification.type,
        priority: notification.priority.toLowerCase(),
        metadata: {
          actionUrl: notification.actionUrl,
          maintenanceId: notification.maintenanceId,
          ...notification.data
        },
        maintenanceRequestId: notification.maintenanceId,
        isRead: false
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // If high priority, trigger immediate sending
    if (this.shouldSendImmediately(priority)) {
      await this.sendImmediateNotification(notification)
    }

    return notification
  }

  /**
   * Validate notification data
   */
  validateNotificationData(
    data: Partial<MaintenanceNotificationData>
  ): string[] {
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
  getNotificationTimeout(priority: Priority): number {
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
  shouldSendImmediately(priority: Priority): boolean {
    return priority === 'EMERGENCY' || priority === 'HIGH'
  }

  /**
   * Send immediate notification (email for high priority)
   */
  private async sendImmediateNotification(
    notification: MaintenanceNotificationData
  ): Promise<void> {
    try {
      // Get user email from database
      const { data: user, error } = await this.supabaseService.getAdminClient()
        .from('User')
        .select('email')
        .eq('id', notification.recipientId)
        .single()

      if (error || !user?.email) {
        this.logger.warn(`Could not find email for user ${notification.recipientId}`)
        return
      }

      // Send email notification using EmailService
      if (notification.data) {
        await this.emailService.sendMaintenanceNotificationEmail(
          user.email,
          notification.data.requestTitle,
          notification.data.propertyName,
          notification.data.unitNumber,
          notification.data.description,
          notification.priority,
          notification.actionUrl
        )
      }

      this.logger.log(`Email notification sent to ${user.email} for ${notification.priority} priority maintenance request`)
    } catch (error) {
      this.logger.error('Failed to send immediate notification:', error)
      // Don't throw - notification was still stored in database
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string) {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('InAppNotification')
      .select('*')
      .eq('userId', userId)
      .eq('isRead', false)
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('InAppNotification')
      .update({ isRead: true, readAt: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('userId', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { error } = await this.supabaseService.getAdminClient()
      .from('InAppNotification')
      .delete()
      .lt('createdAt', cutoffDate.toISOString())
      .eq('isRead', true)

    if (error) {
      throw error
    }
  }
}