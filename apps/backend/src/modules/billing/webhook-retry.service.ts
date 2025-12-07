import { Injectable, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import type { Database } from '@repo/shared/types/supabase'
import { WebhookProcessor } from './webhook-processor.service'
import { logError } from '../../utils/error-serializer'
import { AppLogger } from '../../logger/app-logger.service'

type WebhookEventRow = Database['public']['Tables']['webhook_events']['Row']

@Injectable()
export class WebhookRetryService {

  constructor(
    private readonly supabase: SupabaseService,
    private readonly processor: WebhookProcessor,
    private readonly logger: AppLogger,
    @Optional() private readonly prometheus: PrometheusService | null
  ) { }

  /**
   * Retry failed webhooks every 5 minutes
   * Max 3 retry attempts with exponential backoff
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedWebhooks() {
    this.logger.log('Starting webhook retry job')

    // Check database connection health before proceeding
    const healthCheck = await this.supabase.checkConnection()
    if (healthCheck.status === 'unhealthy') {
      this.logger.warn('Skipping webhook retry job - database connection unhealthy', {
        reason: healthCheck.message,
        method: healthCheck.method
      })
      return
    }

    const client = this.supabase.getAdminClient()

    // Query webhook_attempts table for failed attempts
    const { data: attempts, error } = await client
      .from('webhook_attempts')
      .select('*, webhook_event:webhook_events!inner(*)')
      .eq('status', 'failed')
      .lt('retry_count', 3) // Max 3 retries
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) {
      this.logger.error(logError('Failed to query webhook_attempts', error))
      return
    }

    if (!attempts || attempts.length === 0) {
      this.logger.log('No failed webhooks to retry')
      return
    }

    this.logger.log(`Retrying ${attempts.length} failed webhooks`)

    for (const attempt of attempts) {
      try {
        const webhookEvent = Array.isArray(attempt.webhook_event)
          ? attempt.webhook_event[0]
          : attempt.webhook_event as WebhookEventRow

        if (!webhookEvent) {
          this.logger.warn(`No webhook event found for attempt ${attempt.id}`)
          continue
        }

        // Check if retry should be delayed (exponential backoff)
        const retryCount = attempt.retry_count || 0
        const retryDelay = this.calculateRetryDelay(retryCount)
        const lastAttempted = attempt.last_attempted_at || attempt.created_at || new Date().toISOString()
        const nextRetryTime = new Date(lastAttempted).getTime() + retryDelay
        const now = Date.now()

        if (now < nextRetryTime) {
          this.logger.log(
            `Skipping webhook ${webhookEvent.external_id} - retry scheduled for ${new Date(nextRetryTime).toISOString()}`
          )
          continue
        }

        // Retry by calling webhook controller directly
        this.logger.log(
          `Retrying webhook ${webhookEvent.external_id} (attempt ${retryCount + 1})`
        )

        // Reconstruct Stripe.Event from raw_payload
        const stripeEvent: Stripe.Event = webhookEvent.raw_payload as Stripe.Event

        if (!stripeEvent || !stripeEvent.type) {
          this.logger.error('Invalid Stripe event in raw_payload', {
            eventId: webhookEvent.external_id
          })
          continue
        }

        // Call webhook processor to handle the event
        await this.processor.processEvent(stripeEvent)

        // Mark attempt as successful
        await client
          .from('webhook_attempts')
          .update({
            status: 'success',
            last_attempted_at: new Date().toISOString()
          })
          .eq('id', attempt.id)

        // Record retry success
        this.prometheus?.recordWebhookRetry(webhookEvent.event_type, retryCount + 1)

        this.logger.log(`Successfully retried webhook ${webhookEvent.external_id}`)
      } catch (error) {
        const retryCount = attempt.retry_count || 0

        // Increment retry count
        await client
          .from('webhook_attempts')
          .update({
            retry_count: retryCount + 1,
            last_attempted_at: new Date().toISOString(),
            failure_reason:
              error instanceof Error ? error.message : String(error)
          })
          .eq('id', attempt.id)

        const webhookEvent = Array.isArray(attempt.webhook_event)
          ? attempt.webhook_event[0]
          : attempt.webhook_event as WebhookEventRow

        this.logger.error(
          `Failed to retry webhook ${webhookEvent?.external_id || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`
        )

        // Record retry failure
        if (webhookEvent) {
          this.prometheus?.recordWebhookFailure(
            webhookEvent.event_type,
            error instanceof Error ? error.constructor.name : 'UnknownError'
          )
        }
      }
    }

    this.logger.log('Webhook retry job completed')
  }

  /**
   * Calculate exponential backoff delay
   * Retry 1: 5 minutes
   * Retry 2: 15 minutes
   * Retry 3: 45 minutes
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 5 * 60 * 1000 // 5 minutes in ms
    return baseDelay * Math.pow(3, retryCount)
  }
}