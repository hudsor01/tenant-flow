import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { ValidationService } from '../shared/services/validation.service'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { 
  MaintenanceNotificationData, 
  NotificationType,
  Priority 
} from './dto/notification.dto'
import { z } from 'zod'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly validationService: ValidationService
  ) {}

  /**
   * Zod schemas for notification validation
   */
  private static readonly NOTIFICATION_SCHEMAS = {
    maintenanceNotification: z.object({
      recipientId: z.string().uuid('Invalid recipient ID'),
      title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long'),
      message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
      type: z.string().min(1, 'Type is required'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], {
        message: 'Invalid priority level'
      }),
      actionUrl: z.string().optional(),
      maintenanceId: z.string().uuid('Invalid maintenance ID').optional(),
      data: z.object({
        propertyName: z.string().min(1, 'Property name cannot be empty'),
        unitNumber: z.string().min(1, 'Unit number cannot be empty'),
        description: z.string().max(200, 'Description too long'),
        requestTitle: z.string().min(1, 'Request title cannot be empty')
      })
    }),

    notificationInput: z.object({
      ownerId: z.string().uuid('Invalid owner ID'),
      title: z.string().min(1, 'Title cannot be empty').max(100, 'Title too long'),
      description: z.string().min(1, 'Description cannot be empty').max(500, 'Description too long'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
      propertyName: z.string().min(1, 'Property name cannot be empty'),
      unitNumber: z.string().min(1, 'Unit number cannot be empty'),
      maintenanceId: z.string().uuid().optional(),
      actionUrl: z.string().url('Invalid URL format').optional()
    })
  }

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
    // Validate input data using Zod
    const inputValidation = this.validationService.validateWithZod(
      NotificationsService.NOTIFICATION_SCHEMAS.notificationInput,
      {
        ownerId,
        title,
        description,
        priority,
        propertyName,
        unitNumber,
        maintenanceId,
        actionUrl
      },
      'notificationInput'
    )

    if (!inputValidation.isValid) {
      const errorMessages = inputValidation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      throw new BadRequestException(`Invalid notification input: ${errorMessages}`)
    }

    const priorityLabel = this.getPriorityLabel(priority)

    const notification: MaintenanceNotificationData = {
      recipientId: ownerId,
      title: `${priorityLabel} Maintenance Request`,
      message: `New maintenance request for ${propertyName} - Unit ${unitNumber}: ${title}`,
      type: this.getNotificationType(priority, true),
      priority: priority,
      actionUrl: actionUrl ?? '/maintenance',
      maintenanceId: maintenanceId,
      data: {
        propertyName,
        unitNumber,
        description: description.substring(0, 200), // Truncate for notification
        requestTitle: title
      }
    }

    // Validate notification data with Zod
    const notificationValidation = this.validationService.validateWithZod(
      NotificationsService.NOTIFICATION_SCHEMAS.maintenanceNotification,
      notification,
      'notification'
    )

    if (!notificationValidation.isValid) {
      const errorMessages = notificationValidation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      throw new BadRequestException(`Invalid notification data: ${errorMessages}`)
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

      if (error || !user.email) {
        this.logger.warn(`Could not find email for user ${notification.recipientId}`)
        return
      }

      // Email notifications removed for MVP - focus on in-app notifications only
      this.logger.log(`In-app notification sent for user ${notification.recipientId} (email disabled for MVP)`)
    } catch (error) {
      this.logger.error('Failed to send immediate notification:', error)
      // Don't throw - notification was still stored in database
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Database['public']['Tables']['InAppNotification']['Row'][]> {
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
  async markAsRead(notificationId: string, userId: string): Promise<Database['public']['Tables']['InAppNotification']['Row']> {
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
   * Cancel notification
   */
  async cancelNotification(notificationId: string, userId: string): Promise<Database['public']['Tables']['InAppNotification']['Row']> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('InAppNotification')
      .update({ 
        metadata: { cancelled: true, cancelledAt: new Date().toISOString() }
      })
      .eq('id', notificationId)
      .eq('userId', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    this.logger.log(`Notification ${notificationId} cancelled for user ${userId}`)
    return data
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysToKeep = 30): Promise<void> {
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