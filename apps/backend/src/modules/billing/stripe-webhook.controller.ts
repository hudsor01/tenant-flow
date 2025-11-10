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
	Req,
	SetMetadata
} from '@nestjs/common'
import { Request } from 'express'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StripeConnectService } from './stripe-connect.service'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'

@Controller('webhooks/stripe')
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name)

	constructor(
		private readonly stripeConnect: StripeConnectService,
		private readonly eventEmitter: EventEmitter2,
		private readonly supabase: SupabaseService,
		@Optional() private readonly prometheus: PrometheusService | null
	) {}

	/**
	 * Handle Stripe webhook events
	 *
	 * IMPORTANT: Requires raw body for signature verification
	 * Configure in main.ts with rawBody: true
	 *
	 * PUBLIC ENDPOINT - No CSRF protection required (uses Stripe signature verification)
	 */
	@Post()
	@SetMetadata('isPublic', true)
	async handleWebhook(
		@Req() req: RawBodyRequest<Request>,
		@Headers('stripe-signature') signature: string
	) {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		const stripe = this.stripeConnect.getStripe()
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		let event: Stripe.Event

		try {
			// Verify webhook signature
			event = stripe.webhooks.constructEvent(
				req.rawBody || '',
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
			.from('processed_stripe_events')
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
			await client.from('processed_stripe_events').insert({
				stripe_event_id: event.id,
				event_type: event.type,
				processed_at: new Date().toISOString()
			})

			// Store metrics in webhook_metrics table
			await client.from('webhook_metrics').insert({
				stripe_event_id: event.id,
				event_type: event.type,
				processing_duration_ms: duration,
				success: true,
				created_at: new Date().toISOString()
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

			// Store in webhook_failures table
			await client.from('webhook_failures').insert({
				stripe_event_id: event.id,
				event_type: event.type,
				raw_event_data: JSON.parse(JSON.stringify(event)),
				error_message: error instanceof Error ? error.message : String(error),
				error_stack: error instanceof Error ? (error.stack || null) : null,
				failure_reason: 'processing_error',
				retry_count: 0,
				created_at: new Date().toISOString()
			})

			// Store metrics
			await client.from('webhook_metrics').insert({
				stripe_event_id: event.id,
				event_type: event.type,
				processing_duration_ms: duration,
				success: false,
				created_at: new Date().toISOString()
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
