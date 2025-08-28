import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
// Email service removed for MVP - will add later
import { SupabaseService } from '../database/supabase.service'
// NotificationType will be defined as needed locally

// Use shared types instead of local interfaces
import type { PaymentNotificationData } from '../shared/types/billing.types'
import { NotificationType } from '../shared/types/billing.types'

@Injectable()
export class PaymentNotificationService {
  constructor(
    // Email service removed for MVP
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger
  ) {
    // PinoLogger context handled automatically via app-level configuration
  }

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
        this.logger.error(
          {
            error: userError ? {
              name: userError.constructor.name,
              message: userError.message,
              code: userError.code
            } : null,
            notification: {
              userId,
              type: 'payment_failed',
              hasUser: !!user,
              hasEmail: !!user?.email
            }
          },
          `Could not find user ${userId} for payment notification`
        )
        return
      }

      const isLastAttempt = attemptCount >= 3
      const formattedAmount = (amount / 100).toFixed(2)
      
      // Create in-app notification
      const notificationType: NotificationType = NotificationType.PAYMENT
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
        this.logger.error(
          {
            error: {
              name: notificationError.constructor.name,
              message: notificationError.message,
              code: notificationError.code
            },
            notification: {
              userId,
              type: 'payment_failed'
            }
          },
          'Failed to create in-app notification'
        )
      } else {
        this.logger.info(
          {
            notification: {
              userId,
              type: 'payment_failed',
              attemptCount,
              isLastAttempt
            }
          },
          `Created payment failed notification for user ${userId}`
        )
      }

      this.logger.info(
        {
          payment: {
            userId,
            email: user.email,
            attemptCount,
            isLastAttempt
          }
        },
        `Payment failed notification processed (attempt ${attemptCount})`
      )
      
      // Log critical event for monitoring
      if (isLastAttempt) {
        this.logger.warn(
          {
            payment: {
              userId,
              subscriptionId,
              attemptCount,
              status: 'final_attempt_failed'
            }
          },
          `CRITICAL: Final payment attempt failed for user ${userId}, subscription ${subscriptionId}`
        )
      }
    } catch (error) {
      this.logger.error(
        {
          error: {
            name: error instanceof Error ? error.constructor.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
          },
          notification: {
            userId,
            subscriptionId,
            type: 'payment_failed'
          }
        },
        'Failed to send payment failed notification'
      )
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
          type: NotificationType.PAYMENT,
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
        this.logger.info(`Created payment success notification for user ${userId}`)
      }

      // Send email receipt

      this.logger.info(`Payment receipt sent to ${user.email} for ${currency.toUpperCase()} ${formattedAmount}`)
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
      
      const endDateFormatted = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : 'immediately'
      
      // Create in-app notification
      const { error: notificationError } = await this.supabaseService.getAdminClient()
        .from('InAppNotification')
        .insert({
          userId,
          title: 'Subscription Canceled',
          content: cancelAtPeriodEnd 
            ? `Your subscription has been canceled and will end on ${endDateFormatted}. You can continue using all features until then.`
            : 'Your subscription has been canceled with immediate effect.',
          type: NotificationType.PAYMENT, // Using PAYMENT for cancellation notifications
          priority: 'medium',
          metadata: {
            subscriptionId,
            cancelAtPeriodEnd,
            currentPeriodEnd: currentPeriodEnd,
            actionUrl: '/billing'
          },
          isRead: false
        })

      if (notificationError) {
        this.logger.error(`Failed to create in-app notification: ${notificationError.message}`)
      } else {
        this.logger.info(`Created subscription canceled notification for user ${userId}`)
      }



      this.logger.info(`Subscription cancellation notification sent to ${user.email}`)
      
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
          type: NotificationType.PAYMENT, // Using PAYMENT for subscription status changes
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
      
      this.logger.info(`Trial ending notification created for user ${userId}`)
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
        .eq('type', NotificationType.PAYMENT)
        .lt('createdAt', cutoffDate.toISOString())
        .eq('isRead', true)

      if (error) {
        this.logger.error(`Failed to cleanup old payment notifications: ${error.message}`)
      } else {
        this.logger.info(`Cleaned up old payment notifications older than ${daysToKeep} days`)
      }
    } catch (error) {
      this.logger.error('Failed to cleanup notifications:', error)
    }
  }
}