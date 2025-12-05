/**
 * Stripe Webhook Controller
 *
 * Handles Stripe webhook events for:
 * - Payment method attached/updated
 * - Subscription status changes
 * - Payment failures/retries
 * - Customer deletions
 *
 * Direct processing without EventEmitter for better performance
 */

import type Stripe from 'stripe'
import type {
  RawBodyRequest
} from '@nestjs/common'
import { BadRequestException, Controller, Headers, Optional, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { Public } from '../../shared/decorators/public.decorator'
import type { Json } from '@repo/shared/types/supabase'
import { Throttle } from '@nestjs/throttler'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import { AppConfigService } from '../../config/app-config.service'
import { createThrottleDefaults } from '../../config/throttle.config'
import { WebhookProcessor } from './webhook-processor.service'
import { AppLogger } from '../../logger/app-logger.service'

const STRIPE_WEBHOOK_THROTTLE = createThrottleDefaults({
  envTtlKey: 'WEBHOOK_THROTTLE_TTL',
  envLimitKey: 'WEBHOOK_THROTTLE_LIMIT',
  defaultTtl: 60000,
  defaultLimit: 30
})

@Controller('webhooks/stripe')
export class StripeWebhookController {

  constructor(private readonly stripeConnect: StripeConnectService,
    private readonly supabase: SupabaseService,
    private readonly config: AppConfigService,
    private readonly processor: WebhookProcessor,
    private readonly logger: AppLogger,
    @Optional() private readonly prometheus: PrometheusService | null
  ) { }

  /**
   * Handle Stripe webhook events
   *
   * IMPORTANT: Requires raw body for signature verification
   * Configure in main.ts with rawBody: true
   */
  @Public()
  @Throttle({
    default: STRIPE_WEBHOOK_THROTTLE
  })
  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header')
    }

    const stripe = this.stripeConnect.getStripe()
    const webhookSecret = this.config.getStripeWebhookSecret()

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured')
    }

    let event: Stripe.Event

    const rawBody: string | Buffer | undefined =
      req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : undefined)

    if (!rawBody) {
      this.logger.error('Stripe webhook invoked without raw body payload')
      throw new BadRequestException('Webhook body missing')
    }

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      )
    } catch (error) {
      this.logger.error('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw new BadRequestException('Invalid webhook signature')
    }

    const client = this.supabase.getAdminClient()
    const startTime = Date.now()

    this.logger.log('Stripe webhook received', {
      type: event.type,
      id: event.id
    })

    // Store webhook event UUID for later use (set by RPC)
    let webhookEventId: string | null = null

    try {
      // Use atomic lock via RPC to prevent duplicate processing
      // This creates/retrieves webhook_event and returns its UUID for linking webhook_attempts
      const lockResult = await client.rpc('acquire_webhook_event_lock_with_id', {
        p_webhook_source: 'stripe',
        p_external_id: event.id,
        p_event_type: event.type,
        p_raw_payload: event as unknown as { [key: string]: Json | undefined }
      })

      type LockResult = { lock_acquired: boolean; webhook_event_id: string }
      const data = lockResult.data as LockResult[] | null
      const firstRow = data?.[0]
      const acquired = firstRow?.lock_acquired === true
      webhookEventId = firstRow?.webhook_event_id || null

      if (!acquired) {
        // Record idempotency hit
        this.prometheus?.recordIdempotencyHit(event.type)
        this.logger.log('Duplicate webhook event detected', {
          type: event.type,
          id: event.id
        })
        return { received: true, duplicate: true }
      }

      // Process the webhook event using processor service
      await this.processor.processEvent(event)

      // Record success
      const duration = Date.now() - startTime
      this.prometheus?.recordWebhookProcessing(event.type, duration, 'success')

      // Mark event as processed in webhook_events table
      if (webhookEventId) {
        await client
          .from('webhook_events')
          .update({
            processed_at: new Date().toISOString()
          })
          .eq('id', webhookEventId)
      }

      // Store metrics in webhook_metrics table
      const currentDate = new Date().toISOString().split('T')[0] as string
      await client.from('webhook_metrics').upsert(
        {
          date: currentDate,
          event_type: event.type,
          total_received: 1,
          total_processed: 1,
          total_failed: 0,
          average_latency_ms: duration,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'date,event_type'
        }
      )

      return { received: true }
    } catch (error) {
      // Record failure
      const duration = Date.now() - startTime
      this.prometheus?.recordWebhookProcessing(event.type, duration, 'error')
      this.prometheus?.recordWebhookFailure(
        event.type,
        error instanceof Error ? error.constructor.name : 'UnknownError'
      )

      // Store failure details with proper webhook_event_id reference
      if (webhookEventId) {
        await client
          .from('webhook_attempts')
          .upsert(
            {
              webhook_event_id: webhookEventId,
              status: 'failed',
              failure_reason: error instanceof Error ? error.message : 'processing_error'
            },
            { onConflict: 'webhook_event_id,status', ignoreDuplicates: true }
          )
      }

      // Store metrics
      const currentDate = new Date().toISOString().split('T')[0] as string
      await client.from('webhook_metrics').upsert(
        {
          date: currentDate,
          event_type: event.type,
          total_received: 1,
          total_processed: 0,
          total_failed: 1,
          average_latency_ms: duration,
          created_at: new Date().toISOString()
        },
        {
          onConflict: 'date,event_type'
        }
      )

      this.logger.error('Webhook processing failed', {
        type: event.type,
        id: event.id,
        webhookEventId,
        error: error instanceof Error ? error.message : String(error)
      })

      // Return 500 to trigger Stripe automatic retry
      throw new BadRequestException('Webhook processing failed')
    }
  }
}