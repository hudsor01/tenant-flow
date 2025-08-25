import {
  Controller,
  Headers,
  Logger,
  Post,
  Req
} from '@nestjs/common'
import * as common from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { Resend } from 'resend'
import Stripe from 'stripe'
import { ConfigService } from '@nestjs/config'
import { Public } from '../shared/decorators/public.decorator'
import { CsrfExempt } from '../security/csrf.guard'
import type { EnvironmentVariables } from '../config/config.schema'

// Email template imports (will be created)
import { PaymentFailedEmail } from '../emails/payment-failed-email'
import { PaymentSuccessEmail } from '../emails/payment-success-email'
import { SubscriptionCanceledEmail } from '../emails/subscription-canceled-email'

@Controller('webhooks')
export class UnifiedWebhookController {
  private readonly logger = new Logger(UnifiedWebhookController.name)
  private readonly stripe: Stripe
  private readonly resend: Resend
  private readonly webhookSecret: string

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>
  ) {
    // Initialize Stripe
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY', { infer: true })
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-07-30.basil',
      typescript: true
    })

    // Initialize Resend
    const resendKey = this.configService.get('RESEND_API_KEY', { infer: true })
    if (!resendKey) {
      throw new Error('RESEND_API_KEY is required')
    }
    this.resend = new Resend(resendKey)

    // Webhook secret
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', { infer: true }) ?? ''
    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured')
    }
  }

  @Post('stripe')
  @Public()
  @CsrfExempt()
  async handleStripeWebhook(
    @Req() req: common.RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean }> {
    try {
      if (!signature) {
        this.logger.warn('Missing stripe-signature header')
        throw new Error('Missing stripe-signature header')
      }

      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.webhookSecret
      )

      this.logger.log(`Processing Stripe webhook: ${event.type}`)

      // Validate event.data.object before casting/handling
      const obj = event.data?.object as unknown

      switch (event.type) {
        case 'invoice.payment_failed':
          if (!this.isStripeInvoice(obj)) {
            this.logger.warn(`Invalid invoice payload for ${event.type}`)
            break
          }
          await this.handlePaymentFailed(obj)
          break
        case 'invoice.payment_succeeded':
          if (!this.isStripeInvoice(obj)) {
            this.logger.warn(`Invalid invoice payload for ${event.type}`)
            break
          }
          await this.handlePaymentSucceeded(obj)
          break
        case 'customer.subscription.deleted':
          if (!this.isStripeSubscription(obj)) {
            this.logger.warn(`Invalid subscription payload for ${event.type}`)
            break
          }
          await this.handleSubscriptionCanceled(obj)
          break
        case 'customer.subscription.trial_will_end':
          if (!this.isStripeSubscription(obj)) {
            this.logger.warn(`Invalid subscription payload for ${event.type}`)
            break
          }
          await this.handleTrialEnding(obj)
          break
        default:
          this.logger.log(`Unhandled webhook type: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.error(`Webhook processing failed: ${msg}`)
      throw error
    }
  }

  // Lightweight runtime type-guards to avoid unsafe casts
  private isStripeInvoice(obj: unknown): obj is Stripe.Invoice {
    if (!obj || typeof obj !== 'object') return false
    const anyObj = obj as any
    // basic checks: has currency and either amount_due or amount_paid
    return typeof anyObj.currency === 'string' &&
      (typeof anyObj.amount_due === 'number' || typeof anyObj.amount_paid === 'number')
  }

  private isStripeSubscription(obj: unknown): obj is Stripe.Subscription {
    if (!obj || typeof obj !== 'object') return false
    const anyObj = obj as any
    // basic checks: has id and customer (string or object with id)
    const hasCustomerId = typeof anyObj.customer === 'string' ||
      (typeof anyObj.customer === 'object' && typeof anyObj.customer?.id === 'string')
    return typeof anyObj.id === 'string' && hasCustomerId
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      // resolve customer id safely (invoice.customer can be string or object)
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as any)?.id
      if (!customerId) {
        this.logger.warn(`No customer id on invoice`)
        return
      }

      const customer = await this.stripe.customers.retrieve(customerId)
      if (customer.deleted) {
        this.logger.warn(`Customer not found: ${customerId}`)
        return
      }

      const email = customer.email
      if (!email) {
        this.logger.warn(`No email for customer: ${customer.id}`)
        return
      }

      // Send email directly via Resend
      await this.resend.emails.send({
        from: 'TenantFlow <noreply@tenantflow.app>',
        to: [email],
        subject: `Payment Failed - ${invoice.currency.toUpperCase()} ${(invoice.amount_due / 100).toFixed(2)}`,
        react: PaymentFailedEmail({
          customerEmail: email,
          amount: invoice.amount_due,
          currency: invoice.currency,
          attemptCount: invoice.attempt_count || 1,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          isLastAttempt: (invoice.attempt_count || 1) >= 3
        })
      })

      this.logger.log(`Payment failed email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to handle payment failed: ${error}`)
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as any)?.id
      if (!customerId) { return }

      const customer = await this.stripe.customers.retrieve(customerId)
      if (customer.deleted) {return}

      const email = customer.email
      if (!email) {return}

      await this.resend.emails.send({
        from: 'TenantFlow <noreply@tenantflow.app>',
        to: [email],
        subject: `Payment Receipt - ${invoice.currency.toUpperCase()} ${(invoice.amount_paid / 100).toFixed(2)}`,
        react: PaymentSuccessEmail({
          customerEmail: email,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdf: invoice.invoice_pdf ?? null
        })
      })

      this.logger.log(`Payment success email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to handle payment succeeded: ${error}`)
    }
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as any)?.id
      if (!customerId) {return}

      const customer = await this.stripe.customers.retrieve(customerId)
      if (customer.deleted) {return}

      const email = customer.email
      if (!email) {return}

      await this.resend.emails.send({
        from: 'TenantFlow <noreply@tenantflow.app>',
        to: [email],
        subject: 'Your TenantFlow Subscription Has Been Canceled',
        react: SubscriptionCanceledEmail({
          customerEmail: email,
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: (subscription as { current_period_end?: number }).current_period_end ? new Date(((subscription as { current_period_end?: number }).current_period_end ?? 0) * 1000) : null
        })
      })

      this.logger.log(`Subscription canceled email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to handle subscription canceled: ${error}`)
    }
  }

  private async handleTrialEnding(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as any)?.id
      if (!customerId) {return}

      const customer = await this.stripe.customers.retrieve(customerId)
      if (customer.deleted) {return}

      const email = customer.email
      if (!email) {return}

      // Simple trial ending notification
      await this.resend.emails.send({
        from: 'TenantFlow <noreply@tenantflow.app>',
        to: [email],
        subject: 'Your Free Trial Ends Soon',
        html: `
          <h2>Your TenantFlow trial ends in 3 days</h2>
          <p>Add a payment method to continue using all features.</p>
          <a href="${process.env.FRONTEND_URL}/billing" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Payment Method</a>
        `
      })

      this.logger.log(`Trial ending email sent to ${email}`)
    } catch (error) {
      this.logger.error(`Failed to handle trial ending: ${error}`)
    }
  }
}