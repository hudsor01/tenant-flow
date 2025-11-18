/**
 * Stripe Webhook Controller
 *
 * Handles Stripe webhook events for:
 * - Payment method attached/updated
 * - Subscription status changes
 * - Payment failures/retries
 * - Customer deletions
 *
 * Uses NestJS EventEmitter2 for event-driven cleanup
 */

import type Stripe from 'stripe'
import {
	BadRequestException,
	Controller,
	Headers,
	Logger,
	Optional,
	Post,
	RawBodyRequest,
	Req
} from '@nestjs/common'
import { Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import { AppConfigService } from '../../config/app-config.service'

@Controller('webhooks/stripe')
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name)

	constructor(
		private readonly stripeConnect: StripeConnectService,
		private readonly eventEmitter: EventEmitter2,
		private readonly supabase: SupabaseService,
		private readonly config: AppConfigService,
		@Optional() private readonly prometheus: PrometheusService | null
	) {}

	/**
	 * Handle Stripe webhook events
	 *
	 * IMPORTANT: Requires raw body for signature verification
	 * Configure in main.ts with rawBody: true
	 */
	@Throttle({
		default: {
			ttl: 60000, // TODO: Use CONFIG_DEFAULTS.WEBHOOK_THROTTLE_TTL from config.constants.ts
			limit: 30 // TODO: Use CONFIG_DEFAULTS.WEBHOOK_THROTTLE_LIMIT from config.constants.ts
		}
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

		// Check for duplicate events (idempotency)
		const { data: existing } = await client
			.from('stripe_processed_events')
			.select('id')
			.eq('stripe_event_id', event.id)
			.single()

		if (existing) {
			// Record idempotency hit
			this.prometheus?.recordIdempotencyHit(event.type)
			this.logger.log('Duplicate webhook event detected', {
				type: event.type,
				id: event.id
			})
			return { received: true, duplicate: true }
		}

		// Record event processing start
		const startTime = Date.now()

		this.logger.log('Stripe webhook received', {
			type: event.type,
			id: event.id
		})

		try {
			// CHANGE: Use emitAsync() instead of emit() to propagate errors
			await this.eventEmitter.emitAsync(`stripe.${event.type}`, {
				...(event.data.object as unknown as Record<string, unknown>),
				eventId: event.id,
				eventType: event.type
			})

			// Record success
			const duration = Date.now() - startTime
			this.prometheus?.recordWebhookProcessing(event.type, duration, 'success')

			// Store in processed_stripe_events table
			await client.from('stripe_processed_events').insert({
				stripe_event_id: event.id,
				processed_at: new Date().toISOString()
			})

			// Store metrics in webhook_metrics table
			const currentDate = new Date().toISOString().split('T')[0] as string
			await client.from('webhook_metrics').upsert({
				date: currentDate,
				event_type: event.type,
				total_received: 1,
				total_processed: 1,
				total_failed: 0,
				average_latency_ms: duration,
				created_at: new Date().toISOString()
			}, {
				onConflict: 'date,event_type'
			})

			return { received: true }
		} catch (error) {
			// Record failure
			const duration = Date.now() - startTime
			this.prometheus?.recordWebhookProcessing(event.type, duration, 'error')
			this.prometheus?.recordWebhookFailure(
				event.type,
				error instanceof Error ? error.constructor.name : 'UnknownError'
			)

			// Store failure details in webhook_attempts table
			await client.from('webhook_attempts').insert({
				webhook_event_id: event.id,
				status: 'failed',
				failure_reason: 'processing_error'
			})

			// Store metrics
			const currentDate = new Date().toISOString().split('T')[0] as string
			await client.from('webhook_metrics').upsert({
				date: currentDate,
				event_type: event.type,
				total_received: 1,
				total_processed: 0,
				total_failed: 1,
				average_latency_ms: duration,
				created_at: new Date().toISOString()
			}, {
				onConflict: 'date,event_type'
			})

			this.logger.error('Webhook processing failed', {
				type: event.type,
				id: event.id,
				error: error instanceof Error ? error.message : String(error)
			})

			// Return 500 to trigger Stripe automatic retry
			throw new BadRequestException('Webhook processing failed')
		}
	}
}
