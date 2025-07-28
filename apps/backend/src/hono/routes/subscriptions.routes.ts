import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { env } from 'hono/adapter'
import Stripe from 'stripe'
import type { SubscriptionService } from '../../stripe/subscription.service'
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service'
import type { WebhookService } from '../../stripe/webhook.service'
import type { StripeService } from '../../stripe/stripe.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  createCheckoutSessionSchema,
  createBillingPortalSessionSchema,
  cancelSubscriptionSchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema
} from '../schemas/subscription.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError, type ApiError } from '../utils/error-handler'

export const createSubscriptionsRoutes = (services: {
  subscriptionService: SubscriptionService
  subscriptionsService: SubscriptionsService
  webhookService: WebhookService
  stripeService: StripeService
}) => {
  const { subscriptionService, subscriptionsService, webhookService, stripeService } = services
  const app = new Hono<{ Variables: Variables }>()

  // Apply auth middleware to all routes except webhook
  app.use('/webhook', async (c, next) => {
    // Skip auth for webhook - it uses Stripe signature verification
    await next()
  })
  app.use('*', authMiddleware)

  // POST /subscriptions/webhook - Stripe webhook handler
  app.post('/webhook', async (c) => {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = env<{
      STRIPE_SECRET_KEY: string
      STRIPE_WEBHOOK_SECRET: string
    }>(c)

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      throw new HTTPException(500, { message: 'Stripe configuration missing' })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const signature = c.req.header('stripe-signature')

    if (!signature) {
      throw new HTTPException(400, { message: 'Missing stripe-signature header' })
    }

    try {
      // Get raw body for signature verification
      const body = await c.req.text()
      
      // Verify webhook signature
      const event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      )

      // Process the webhook event using existing service
      await webhookService.handleWebhookEvent(event)
      
      return c.json({ received: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Webhook error'
      
      // Log error but don't expose internal details
      console.error('Webhook signature verification failed:', errorMessage)
      
      throw new HTTPException(400, { 
        message: 'Webhook signature verification failed' 
      })
    }
  })

  // GET /subscriptions/current - Get current subscription
  app.get('/current', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const subscription = await subscriptionsService.getSubscription(user.id)
      return c.json(subscription)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  // POST /subscriptions/checkout - Create checkout session
  app.post(
    '/checkout',
    requireAuth,
    zValidator('json', createCheckoutSessionSchema),
    async (c) => {
      const user = c.get('user')!
      const { priceId, successUrl, cancelUrl } = c.req.valid('json')

      try {
        // Get user's stripe customer ID if exists
        const userWithCustomer = await subscriptionsService.getSubscription(user.id)
        
        const session = await stripeService.createCheckoutSession({
          customerId: userWithCustomer?.stripeCustomerId ?? undefined,
          customerEmail: user.email,
          priceId,
          mode: 'subscription',
          successUrl,
          cancelUrl,
          metadata: {
            userId: user.id
          }
        })
        
        return c.json({ 
          id: session.id, 
          url: session.url 
        })
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // POST /subscriptions/billing-portal - Create billing portal session
  app.post(
    '/billing-portal',
    requireAuth,
    zValidator('json', createBillingPortalSessionSchema),
    async (c) => {
      const user = c.get('user')!
      const { returnUrl } = c.req.valid('json')

      try {
        const url = await subscriptionService.createPortalSession(
          user.id,
          returnUrl
        )
        return c.json({ url })
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // POST /subscriptions/cancel - Cancel subscription
  app.post(
    '/cancel',
    requireAuth,
    zValidator('json', cancelSubscriptionSchema),
    async (c) => {
      const user = c.get('user')!
      const { subscriptionId: _subscriptionId, reason, feedback } = c.req.valid('json')

      try {
        const result = await subscriptionService.cancelSubscription({
          userId: user.id,
          cancelAtPeriodEnd: true
        })
        
        // Optionally store the cancellation reason and feedback
        if (reason || feedback) {
          // This could be logged or stored in a separate table
          console.log(`Cancellation reason: ${reason}, feedback: ${feedback}`)
        }
        
        return c.json(result)
      } catch (error) {
        if (error instanceof Error && error.message === 'No active subscription found') {
          throw new HTTPException(404, { message: error.message })
        }
        if (error instanceof HTTPException) throw error
        throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
      }
    }
  )

  // GET /subscriptions/payment-methods - Get payment methods
  app.get('/payment-methods', requireAuth, async (c) => {
    const _user = c.get('user')!

    try {
      // Payment methods not implemented
      const methods: unknown[] = []
      return c.json(methods)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  // POST /subscriptions/payment-methods - Add payment method
  app.post(
    '/payment-methods',
    requireAuth,
    zValidator('json', createPaymentMethodSchema),
    async (c) => {
      const _user = c.get('user')!
      const { paymentMethodId: _paymentMethodId } = c.req.valid('json')

      try {
        // Add payment method not implemented
        const method = { success: true }
        return c.json(method)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // PUT /subscriptions/payment-methods/default - Set default payment method
  app.put(
    '/payment-methods/default',
    requireAuth,
    zValidator('json', updatePaymentMethodSchema),
    async (c) => {
      const _user = c.get('user')!
      const { paymentMethodId: _paymentMethodId } = c.req.valid('json')

      try {
        // Set default payment method not implemented
        const result = { success: true }
        return c.json(result)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // DELETE /subscriptions/payment-methods/:id - Remove payment method
  app.delete(
    '/payment-methods/:id',
    requireAuth,
    async (c) => {
      const _user = c.get('user')!
      const _paymentMethodId = c.req.param('id')

      try {
        // Remove payment method not implemented
        const result = { success: true }
        return c.json(result)
      } catch (error) {
        return handleRouteError(error as ApiError, c)
      }
    }
  )

  // GET /subscriptions/usage - Get usage statistics
  app.get('/usage', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const usage = await subscriptionsService.calculateUsageMetrics(user.id)
      return c.json(usage)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  // GET /subscriptions/invoices - Get billing history
  app.get('/invoices', requireAuth, async (c) => {
    const _user = c.get('user')!

    try {
      // Billing history not implemented
      const invoices: unknown[] = []
      return c.json(invoices)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  // POST /subscriptions/trial - Start free trial
  app.post('/trial', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const trial = await subscriptionService.startFreeTrial(user.id)
      return c.json(trial)
    } catch (error) {
      return handleRouteError(error as ApiError, c)
    }
  })

  return app
}