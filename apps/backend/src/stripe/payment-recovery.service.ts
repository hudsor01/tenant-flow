import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
// import { NotificationService } from '../notifications/notification.service' // TODO: Implement when notification service is ready
import type { Stripe } from 'stripe'
import type { SubStatus } from '@prisma/client'

export interface PaymentRecoveryOptions {
  maxRetries?: number
  retryDelayHours?: number[]
  sendReminders?: boolean
  pauseOnFailure?: boolean
}

export interface RecoveryAttempt {
  attemptNumber: number
  status: 'success' | 'failed' | 'pending'
  error?: string
  timestamp: Date
}

/**
 * Service for handling payment failures and recovery strategies
 * Implements Stripe's best practices for dunning and payment recovery
 */
@Injectable()
export class PaymentRecoveryService {
  private readonly logger = new Logger(PaymentRecoveryService.name)
  
  private readonly defaultOptions: PaymentRecoveryOptions = {
    maxRetries: 4,
    retryDelayHours: [0, 24, 72, 168], // Immediate, 1 day, 3 days, 7 days
    sendReminders: true,
    pauseOnFailure: true
  }

  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeService: StripeService,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Handle payment failure from webhook
   */
  async handlePaymentFailure(
    invoice: Stripe.Invoice,
    options?: PaymentRecoveryOptions
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }
    
    try {
      const subscription = await this.getSubscriptionFromInvoice(invoice)
      if (!subscription) {
        this.logger.warn('No subscription found for failed invoice', {
          invoiceId: invoice.id,
          customerId: invoice.customer
        })
        return
      }

      // Log payment failure
      await this.logPaymentFailure(subscription.id, invoice)

      // Get retry attempt number
      const attemptNumber = invoice.attempt_count || 1

      // Send notification based on attempt
      if (opts.sendReminders) {
        await this.sendPaymentFailureNotification(subscription.userId, attemptNumber, invoice)
      }

      // Handle based on attempt number
      if (attemptNumber >= (opts.maxRetries || 4)) {
        await this.handleFinalPaymentFailure(subscription.id, invoice)
      } else {
        await this.scheduleNextRetry(subscription.id, attemptNumber, opts)
      }

    } catch (error) {
      this.logger.error('Error handling payment failure', error as Error, {
        invoiceId: invoice.id
      })
      throw error
    }
  }

  /**
   * Manually retry a failed payment
   */
  async retryFailedPayment(
    subscriptionId: string,
    paymentMethodId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.prismaService.subscription.findUnique({
        where: { id: subscriptionId },
        include: { User: true }
      })

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw this.errorHandler.createNotFoundError('Subscription', subscriptionId)
      }

      // Update payment method if provided
      if (paymentMethodId) {
        await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
          default_payment_method: paymentMethodId
        })
      }

      // Get the latest unpaid invoice
      const invoices = await this.stripeService.client.invoices.list({
        subscription: subscription.stripeSubscriptionId,
        status: 'open',
        limit: 1
      })

      if (invoices.data.length === 0) {
        return { success: true, error: 'No open invoices found' }
      }

      const invoice = invoices.data[0]

      // Attempt to pay the invoice
      if (!invoice || !invoice.id) {
        throw new Error('Invoice ID is missing')
      }
      const paidInvoice = await this.stripeService.client.invoices.pay(invoice.id)

      if (paidInvoice.status === 'paid') {
        // Update subscription status
        await this.updateSubscriptionStatus(subscriptionId, 'ACTIVE')
        
        // Send success notification
        // TODO: Implement notification service
        this.logger.warn('Payment successful - notification would be sent', {
          email: subscription.User?.email,
          name: subscription.User?.name || 'Customer'
        })

        return { success: true }
      } else {
        return { 
          success: false, 
          error: `Payment failed with status: ${paidInvoice.status}` 
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment retry failed'
      this.logger.error('Failed to retry payment', error as Error, { subscriptionId })
      
      return { 
        success: false, 
        error: errorMessage 
      }
    }
  }

  /**
   * Get payment retry status for a subscription
   */
  async getPaymentRetryStatus(subscriptionId: string): Promise<{
    hasFailedPayments: boolean
    lastFailure?: Date
    nextRetry?: Date
    attemptCount: number
    canRetry: boolean
  }> {
    try {
      const subscription = await this.prismaService.subscription.findUnique({
        where: { id: subscriptionId }
      })

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw this.errorHandler.createNotFoundError('Subscription', subscriptionId)
      }

      // Get unpaid invoices
      const invoices = await this.stripeService.client.invoices.list({
        subscription: subscription.stripeSubscriptionId,
        status: 'open',
        limit: 10
      })

      if (invoices.data.length === 0) {
        return {
          hasFailedPayments: false,
          attemptCount: 0,
          canRetry: false
        }
      }

      const latestInvoice = invoices.data[0]
      const attemptCount = latestInvoice?.attempt_count || 0

      return {
        hasFailedPayments: true,
        lastFailure: latestInvoice?.created ? new Date(latestInvoice.created * 1000) : undefined,
        nextRetry: latestInvoice?.next_payment_attempt 
          ? new Date(latestInvoice.next_payment_attempt * 1000) 
          : undefined,
        attemptCount,
        canRetry: attemptCount < 4 && subscription.status !== 'CANCELED'
      }

    } catch (error) {
      this.logger.error('Failed to get payment retry status', error as Error, { subscriptionId })
      throw error
    }
  }

  /**
   * Update customer payment method and retry all failed payments
   */
  async updatePaymentMethodAndRetry(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; retriedInvoices: number }> {
    try {
      // Update customer's default payment method
      await this.stripeService.client.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })

      // Get all open invoices for the customer
      const invoices = await this.stripeService.client.invoices.list({
        customer: customerId,
        status: 'open',
        limit: 100
      })

      let successCount = 0

      // Retry each open invoice
      for (const invoice of invoices.data) {
        try {
          if (!invoice.id) {
            this.logger.warn('Skipping invoice without ID', { invoiceId: invoice.id })
            continue
          }
          const paidInvoice = await this.stripeService.client.invoices.pay(invoice.id)
          
          if (paidInvoice.status === 'paid') {
            successCount++
          }
        } catch (error) {
          this.logger.warn('Failed to retry invoice payment', {
            invoiceId: invoice.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        success: successCount > 0,
        retriedInvoices: successCount
      }

    } catch (error) {
      this.logger.error('Failed to update payment method and retry', error as Error, {
        customerId
      })
      throw error
    }
  }

  // Private helper methods

  private async getSubscriptionFromInvoice(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : invoice.customer?.id

    if (!customerId) return null

    return await this.prismaService.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { User: true }
    })
  }

  private async logPaymentFailure(
    subscriptionId: string,
    invoice: Stripe.Invoice
  ): Promise<void> {
    await this.prismaService.paymentFailure.create({
      data: {
        subscriptionId,
        stripeInvoiceId: invoice.id || '',
        amount: invoice.amount_due,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count || 1,
        errorCode: invoice.last_finalization_error?.code,
        errorMessage: invoice.last_finalization_error?.message,
        nextRetryAt: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000) 
          : null
      }
    })
  }

  private async sendPaymentFailureNotification(
    userId: string,
    attemptNumber: number,
    invoice: Stripe.Invoice
  ): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId }
    })

    if (!user) return

    const nextRetry = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null

    // TODO: Implement notification service
    this.logger.warn('Payment failure notification would be sent', {
      email: user.email,
      name: user.name || 'Customer',
      attemptNumber,
      nextRetry
    })
  }

  private async scheduleNextRetry(
    subscriptionId: string,
    attemptNumber: number,
    options: PaymentRecoveryOptions
  ): Promise<void> {
    const delayHours = options.retryDelayHours?.[attemptNumber] || 24
    const nextRetryAt = new Date()
    nextRetryAt.setHours(nextRetryAt.getHours() + delayHours)

    this.logger.log('Scheduling next payment retry', {
      subscriptionId,
      attemptNumber,
      nextRetryAt
    })

    // Stripe automatically handles retries based on subscription settings
    // We just log it for our records
    await this.prismaService.paymentFailure.updateMany({
      where: { 
        subscriptionId,
        resolved: false 
      },
      data: {
        nextRetryAt
      }
    })
  }

  private async handleFinalPaymentFailure(
    subscriptionId: string,
    invoice: Stripe.Invoice
  ): Promise<void> {
    this.logger.warn('Final payment attempt failed', {
      subscriptionId,
      invoiceId: invoice.id
    })

    // Update subscription status to past due
    await this.updateSubscriptionStatus(subscriptionId, 'PAST_DUE')

    // Send final notification
    const subscription = await this.prismaService.subscription.findUnique({
      where: { id: subscriptionId },
      include: { User: true }
    })

    if (subscription) {
      // TODO: Implement notification service
      this.logger.warn('Subscription suspended notification would be sent', {
        email: subscription.User.email,
        name: subscription.User.name || 'Customer'
      })
    }

    // Mark all payment failures as final
    await this.prismaService.paymentFailure.updateMany({
      where: { 
        subscriptionId,
        resolved: false 
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        finalAttempt: true
      }
    })
  }

  private async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubStatus
  ): Promise<void> {
    await this.prismaService.subscription.update({
      where: { id: subscriptionId },
      data: { status }
    })
  }
}