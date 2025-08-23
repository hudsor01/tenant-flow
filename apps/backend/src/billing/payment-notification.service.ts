import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from '../email/email.service'
import { SupabaseService } from '../database/supabase.service'
import type { NotificationType } from '../notifications/dto/notification.dto'

export interface PaymentNotificationData {
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'canceled'
  attemptCount?: number
  failureReason?: string
  invoiceUrl?: string | null
  invoicePdf?: string | null
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date
}

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name)

  constructor(
    private readonly emailService: EmailService,
    private readonly supabaseService: SupabaseService
  ) {}

  /**
   * Send payment failed notification
   * Creates in-app notification and sends email for failed payments
   */
  async notifyPaymentFailed(data: PaymentNotificationData): Promise<void> {
    const { userId, subscriptionId, amount, currency, attemptCount = 1, failureReason, invoiceUrl } = data
    
    try {
      // Get user email
      const { data: user, error: userError } = await this.supabaseService.getAdminClient()
        .from('User')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (userError || !user?.email) {
        this.logger.error(`Could not find user ${userId} for payment notification: ${userError?.message}`)
        return
      }

      const isLastAttempt = attemptCount >= 3
      const formattedAmount = (amount / 100).toFixed(2)
      
      // Create in-app notification
      const notificationType: NotificationType = isLastAttempt ? 'payment_overdue' : 'payment_overdue'
      const priority = isLastAttempt ? 'HIGH' : 'MEDIUM'
      
      const { error: notificationError } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .insert({
          userId,
          title: isLastAttempt ? 'Final Payment Attempt Failed' : 'Payment Failed',
          content: `Your payment of ${currency.toUpperCase()} ${formattedAmount} could not be processed. ${
            isLastAttempt 
              ? 'This was your final attempt. Please update your payment method immediately to avoid service interruption.' 
              : `Attempt ${attemptCount} of 3. We will retry in 24 hours.`
          }`,
          type: notificationType,
          priority: priority.toLowerCase(),
          metadata: {
            subscriptionId,
            amount,
            currency,
            attemptCount,
            failureReason,
            invoiceUrl,
            actionUrl: '/billing'
          },
          isRead: false
        })

      if (notificationError) {
        this.logger.error(`Failed to create in-app notification: ${notificationError.message}`)
      } else {
        this.logger.log(`Created payment failed notification for user ${userId}`)
      }

      // Send email notification
      await this.emailService.sendPaymentFailedEmail(
        user.email,
        subscriptionId,
        amount,
        currency,
        attemptCount,
        failureReason,
        invoiceUrl
      )

      this.logger.log(`Payment failed notification sent to ${user.email} (attempt ${attemptCount})`)
      
      // Log critical event for monitoring
      if (isLastAttempt) {
        this.logger.warn(`CRITICAL: Final payment attempt failed for user ${userId}, subscription ${subscriptionId}`)
      }
    } catch (error) {
      this.logger.error('Failed to send payment failed notification:', error)
      // Don't throw - we don't want to break the payment flow
    }
  }

  /**
   * Send payment success notification
   * Creates in-app notification and sends email receipt
   */
  async notifyPaymentSuccess(data: PaymentNotificationData): Promise<void> {
    const { userId, subscriptionId, amount, currency, invoiceUrl, invoicePdf } = data
    
    try {
      // Get user email
      const { data: user, error: userError } = await this.supabaseService.getAdminClient()
        .from('User')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (userError || !user?.email) {
        this.logger.error(`Could not find user ${userId} for payment notification: ${userError?.message}`)
        return
      }

      const formattedAmount = (amount / 100).toFixed(2)
      
      // Create in-app notification
      const { error: notificationError } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .insert({
          userId,
          title: 'Payment Successful',
          content: `Your payment of ${currency.toUpperCase()} ${formattedAmount} has been successfully processed. Thank you!`,
          type: 'payment_received' as NotificationType,
          priority: 'low',
          metadata: {
            subscriptionId,
            amount,
            currency,
            invoiceUrl,
            invoicePdf,
            actionUrl: invoiceUrl || '/billing'
          },
          isRead: false
        })

      if (notificationError) {
        this.logger.error(`Failed to create in-app notification: ${notificationError.message}`)
      } else {
        this.logger.log(`Created payment success notification for user ${userId}`)
      }

      // Send email receipt
      await this.emailService.sendPaymentSuccessEmail(
        user.email,
        subscriptionId,
        amount,
        currency,
        invoiceUrl,
        invoicePdf
      )

      this.logger.log(`Payment receipt sent to ${user.email} for ${currency.toUpperCase()} ${formattedAmount}`)
    } catch (error) {
      this.logger.error('Failed to send payment success notification:', error)
      // Don't throw - receipt is not critical
    }
  }

  /**
   * Send subscription canceled notification
   * Creates in-app notification and sends cancellation email
   */
  async notifySubscriptionCanceled(data: PaymentNotificationData): Promise<void> {
    const { userId, subscriptionId, cancelAtPeriodEnd = false, currentPeriodEnd } = data
    
    try {
      // Get user email
      const { data: user, error: userError } = await this.supabaseService.getAdminClient()
        .from('User')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (userError || !user?.email) {
        this.logger.error(`Could not find user ${userId} for cancellation notification: ${userError?.message}`)
        return
      }
      
      const endDateFormatted = currentPeriodEnd ? currentPeriodEnd.toLocaleDateString() : 'immediately'
      
      // Create in-app notification
      const { error: notificationError } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .insert({
          userId,
          title: 'Subscription Canceled',
          content: cancelAtPeriodEnd 
            ? `Your subscription has been canceled and will end on ${endDateFormatted}. You can continue using all features until then.`
            : 'Your subscription has been canceled with immediate effect.',
          type: 'payment_overdue' as NotificationType, // Using existing type since there's no subscription_canceled
          priority: 'medium',
          metadata: {
            subscriptionId,
            cancelAtPeriodEnd,
            currentPeriodEnd: currentPeriodEnd?.toISOString(),
            actionUrl: '/billing'
          },
          isRead: false
        })

      if (notificationError) {
        this.logger.error(`Failed to create in-app notification: ${notificationError.message}`)
      } else {
        this.logger.log(`Created subscription canceled notification for user ${userId}`)
      }

      // Send cancellation email
      await this.emailService.sendSubscriptionCanceledEmail(
        user.email,
        subscriptionId,
        cancelAtPeriodEnd,
        currentPeriodEnd
      )

      this.logger.log(`Subscription cancellation notification sent to ${user.email}`)
      
      // Log for business metrics
      this.logger.warn(`Subscription canceled for user ${userId}: ${subscriptionId}`)
    } catch (error) {
      this.logger.error('Failed to send subscription canceled notification:', error)
      // Don't throw - we still want the cancellation to proceed
    }
  }

  /**
   * Send trial ending reminder
   * Sends notification 3 days before trial ends
   */
  async notifyTrialEnding(userId: string, subscriptionId: string, trialEndDate: Date): Promise<void> {
    try {
      // Get user email
      const { data: user, error: userError } = await this.supabaseService.getAdminClient()
        .from('User')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (userError || !user?.email) {
        this.logger.error(`Could not find user ${userId} for trial ending notification: ${userError?.message}`)
        return
      }

      const formattedDate = trialEndDate.toLocaleDateString()
      
      // Create in-app notification
      const { error: notificationError } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .insert({
          userId,
          title: 'Free Trial Ending Soon',
          content: `Your free trial will end on ${formattedDate}. Add a payment method to continue enjoying all features without interruption.`,
          type: 'payment_overdue' as NotificationType, // Using existing type
          priority: 'medium',
          metadata: {
            subscriptionId,
            trialEndDate: trialEndDate.toISOString(),
            actionUrl: '/billing'
          },
          isRead: false
        })

      if (notificationError) {
        this.logger.error(`Failed to create trial ending notification: ${notificationError.message}`)
      }

      // For trial ending, we might want to send an email too
      // This could be implemented similar to other email methods
      
      this.logger.log(`Trial ending notification created for user ${userId}`)
    } catch (error) {
      this.logger.error('Failed to send trial ending notification:', error)
    }
  }

  /**
   * Clean up old payment notifications
   * Removes read notifications older than specified days
   */
  async cleanupOldNotifications(daysToKeep = 90): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const { error } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .delete()
        .in('type', ['payment_received', 'payment_overdue'])
        .lt('createdAt', cutoffDate.toISOString())
        .eq('isRead', true)

      if (error) {
        this.logger.error(`Failed to cleanup old payment notifications: ${error.message}`)
      } else {
        this.logger.log(`Cleaned up old payment notifications older than ${daysToKeep} days`)
      }
    } catch (error) {
      this.logger.error('Failed to cleanup notifications:', error)
    }
  }
}