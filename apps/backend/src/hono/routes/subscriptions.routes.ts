import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { env } from 'hono/adapter'
import Stripe from 'stripe'
import type { SubscriptionService } from '../../stripe/subscription.service'
import type { SubscriptionsService } from '../../subscriptions/subscriptions.service'
import type { WebhookService } from '../../stripe/webhook.service'
import { authMiddleware, requireAuth, type Variables } from '../middleware/auth.middleware'
import {
  createCheckoutSessionSchema,
  createBillingPortalSessionSchema,
  cancelSubscriptionSchema,
  createPaymentMethodSchema,
  updatePaymentMethodSchema
} from '../schemas/subscription.schemas'
// ApiError type is handled by handleRouteError function
import { handleRouteError } from '../utils/error-handler'

export const createSubscriptionsRoutes = (services: {
  subscriptionService: SubscriptionService
  subscriptionsService: SubscriptionsService
  webhookService: WebhookService
}) => {
  const { subscriptionService, subscriptionsService, webhookService } = services
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
      const subscription = await subscriptionService.getSubscription(user.id)
      return c.json(subscription)
    } catch (error) {
      return handleRouteError(error, c)
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
        const session = await subscriptionService.createCheckoutSession({
          userId: user.id,
          priceId,
          successUrl,
          cancelUrl
        })
        return c.json(session)
      } catch (error) {
        return handleRouteError(error, c)
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
        const session = await subscriptionService.createBillingPortalSession(
          user.id,
          returnUrl
        )
        return c.json(session)
      } catch (error) {
        return handleRouteError(error, c)
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
      const { reason, feedback } = c.req.valid('json')

      try {
        const result = await subscriptionService.cancelSubscription(
          user.id,
          reason,
          feedback
        )
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
    const user = c.get('user')!

    try {
      const methods = await subscriptionService.getPaymentMethods(user.id)
      return c.json(methods)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // POST /subscriptions/payment-methods - Add payment method
  app.post(
    '/payment-methods',
    requireAuth,
    zValidator('json', createPaymentMethodSchema),
    async (c) => {
      const user = c.get('user')!
      const { paymentMethodId } = c.req.valid('json')

      try {
        const method = await subscriptionService.addPaymentMethod(
          user.id,
          paymentMethodId
        )
        return c.json(method)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // PUT /subscriptions/payment-methods/default - Set default payment method
  app.put(
    '/payment-methods/default',
    requireAuth,
    zValidator('json', updatePaymentMethodSchema),
    async (c) => {
      const user = c.get('user')!
      const { paymentMethodId } = c.req.valid('json')

      try {
        const result = await subscriptionService.setDefaultPaymentMethod(
          user.id,
          paymentMethodId
        )
        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
      }
    }
  )

  // DELETE /subscriptions/payment-methods/:id - Remove payment method
  app.delete(
    '/payment-methods/:id',
    requireAuth,
    async (c) => {
      const user = c.get('user')!
      const paymentMethodId = c.req.param('id')

      try {
        const result = await subscriptionService.removePaymentMethod(
          user.id,
          paymentMethodId
        )
        return c.json(result)
      } catch (error) {
        return handleRouteError(error, c)
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
      return handleRouteError(error, c)
    }
  })

  // GET /subscriptions/invoices - Get billing history
  app.get('/invoices', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const invoices = await subscriptionService.getBillingHistory(user.id)
      return c.json(invoices)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  // POST /subscriptions/trial - Start free trial
  app.post('/trial', requireAuth, async (c) => {
    const user = c.get('user')!

    try {
      const trial = await subscriptionService.startFreeTrial(user.id)
      return c.json(trial)
    } catch (error) {
      return handleRouteError(error, c)
    }
  })

  return app
}