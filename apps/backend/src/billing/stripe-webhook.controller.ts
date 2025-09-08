import { Controller, Post, Req, Res, HttpCode, HttpStatus, Optional } from '@nestjs/common'
import { Public } from '../shared/decorators/public.decorator'
import { StripeSyncService } from './stripe-sync.service'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { PinoLogger } from 'nestjs-pino'

/**
 * Dedicated Stripe Webhook Controller
 * 
 * Separates data synchronization from business logic
 * Following Phase 3 of Stripe Sync Engine Integration Plan
 * Ultra-native implementation with async processing
 */
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeSyncService: StripeSyncService,
    @Optional() private readonly logger?: PinoLogger
  ) {
    this.logger?.setContext(StripeWebhookController.name)
  }

  @Post('sync')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleStripeSyncWebhook(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    const startTime = Date.now()
    
    try {
      const signature = request.headers['stripe-signature'] as string
      const rawBody = (request as any).rawBody as Buffer

      if (!signature || !rawBody) {
        this.logger?.error('Missing signature or body in webhook request')
        return reply.status(400).send({ error: 'Missing signature or body' })
      }

      this.logger?.info('Received Stripe Sync webhook', {
        hasSignature: !!signature,
        bodySize: rawBody.length
      })

      // Process webhook through Stripe Sync Engine (Ultra-native)
      // This runs synchronously to ensure webhook is processed
      await this.stripeSyncService.processWebhook(rawBody, signature)

      // Optional: Trigger business logic notifications asynchronously
      // This runs AFTER the data is synchronized for better performance
      setImmediate(() => {
        this.handleBusinessLogicAsync(rawBody, signature)
      })

      const responseTime = Date.now() - startTime
      this.logger?.info(`Stripe webhook processed successfully in ${responseTime}ms`)

      return reply.status(200).send({ 
        received: true,
        processed_at: new Date().toISOString(),
        processing_time_ms: responseTime
      })
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.logger?.error('Stripe webhook processing failed:', {
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: responseTime,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      return reply.status(400).send({ 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Handle business logic notifications asynchronously
   * Separated from data sync for better performance and reliability
   */
  private async handleBusinessLogicAsync(rawBody: Buffer, signature: string) {
    try {
      // Parse webhook event for business notifications
      const eventString = rawBody.toString()
      const event = JSON.parse(eventString)

      this.logger?.info('Processing business logic for webhook event:', {
        eventType: event?.type,
        eventId: event?.id,
        livemode: event?.livemode
      })

      // TODO: Implement business-specific logic here:
      // - Send email notifications
      // - Create in-app notifications
      // - Update user subscription status
      // - Trigger marketing automation
      // - Log events for analytics

      switch (event?.type) {
        case 'customer.subscription.created':
          this.logger?.info('New subscription created', { customerId: event.data.object.customer })
          break
        case 'customer.subscription.updated':
          this.logger?.info('Subscription updated', { customerId: event.data.object.customer })
          break
        case 'customer.subscription.deleted':
          this.logger?.info('Subscription cancelled', { customerId: event.data.object.customer })
          break
        case 'invoice.payment_succeeded':
          this.logger?.info('Payment succeeded', { customerId: event.data.object.customer })
          break
        case 'invoice.payment_failed':
          this.logger?.info('Payment failed', { customerId: event.data.object.customer })
          break
        default:
          this.logger?.debug('Unhandled webhook event type', { eventType: event?.type })
      }
    } catch (error) {
      // Log error but don't fail - webhook already returned 200
      this.logger?.error('Business logic processing failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }
}