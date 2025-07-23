import {
	Controller,
	Post,
	Request,
	UseGuards,
	Logger,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'
import type Stripe from 'stripe'
import { WebhookService } from '../services/webhook.service'
import { StripeWebhookGuard } from '../guards/stripe-webhook.guard'
import { WebhookThrottlerGuard } from '../guards/webhook-throttler.guard'

@Controller('stripe/webhook')
export class WebhookController {
	private readonly logger = new Logger(WebhookController.name)

	constructor(private webhookService: WebhookService) {}

	@Post()
	@Throttle({ webhook: { limit: 100, ttl: 60000 } })
	@UseGuards(WebhookThrottlerGuard, StripeWebhookGuard)
	async handleWebhook(
		@Request()
		req: FastifyRequest & { stripeEvent?: Stripe.Event; rawBody?: Buffer }
	) {
		const requestStart = performance.now()
		const requestId = `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		
		// Log webhook receipt (production-safe)
		this.logger.log(`🎯 [${requestId}] Stripe webhook received`)
		
		// Detailed logging only in development
		if (process.env.NODE_ENV === 'development') {
			this.logger.log(`📥 [${requestId}] Request details:`, {
				method: req.method,
				url: req.url,
				headers: {
					'stripe-signature': req.headers['stripe-signature'] ? '[PRESENT]' : '[MISSING]',
					'content-type': req.headers['content-type'],
					'content-length': req.headers['content-length'],
					'user-agent': req.headers['user-agent']
				},
				hasRawBody: !!req.rawBody,
				rawBodyLength: req.rawBody?.length || 0,
				hasStripeEvent: !!req.stripeEvent,
				timestamp: new Date().toISOString()
			})
		}

		try {
			const event = req.stripeEvent

			if (!event) {
				this.logger.error(`❌ [${requestId}] No Stripe event found in request`)
				this.logger.error(`❌ [${requestId}] Request debugging info:`, {
					hasStripeEvent: !!req.stripeEvent,
					hasRawBody: !!req.rawBody,
					rawBodyPreview: req.rawBody ? req.rawBody.toString('utf8').substring(0, 100) : 'none',
					guardPassed: 'StripeWebhookGuard passed (event should exist)'
				})
				
				throw new HttpException(
					'Invalid webhook event - guard validation failed',
					HttpStatus.BAD_REQUEST
				)
			}

			// Log event processing (production-safe)
			this.logger.log(`🚀 [${requestId}] Processing event: ${event.type}`)
			
			// Detailed event info only in development
			if (process.env.NODE_ENV === 'development') {
				this.logger.log(`Event details:`, {
					eventId: event.id,
					eventType: event.type,
					created: new Date(event.created * 1000).toISOString(),
					livemode: event.livemode,
					apiVersion: event.api_version,
					hasData: !!event.data,
					dataObjectType: event.data?.object && typeof event.data.object === 'object' && 'object' in event.data.object 
						? (event.data.object as { object: string }).object 
						: 'unknown'
				})
			}

			// Log event data for debugging (be careful with sensitive data)
			if (event.data?.object && typeof event.data.object === 'object') {
				// Type-safe access to Stripe event object properties
				const obj = event.data.object as unknown as Record<string, string | number | boolean | null | undefined> & {
					object?: string
					id?: string
					status?: string
					amount?: number
					amount_total?: number
					currency?: string
					customer?: string
					subscription?: string
					metadata?: Record<string, string | number | boolean | null>
				}
				this.logger.log(`📊 [${requestId}] Event data summary:`, {
					objectType: obj.object || 'unknown',
					objectId: obj.id || 'unknown',
					status: obj.status,
					amount: obj.amount || obj.amount_total || 'N/A',
					currency: obj.currency || 'N/A',
					customer: obj.customer || 'N/A',
					subscription: obj.subscription || 'N/A',
					metadata: obj.metadata || {}
				})
			}

			this.logger.log(`⚡ [${requestId}] Calling webhook service...`)
			await this.webhookService.handleWebhook(event)

			const processingTime = performance.now() - requestStart
			this.logger.log(`✅ [${requestId}] Webhook processed successfully in ${processingTime.toFixed(2)}ms`)

			return { 
				received: true, 
				eventId: event.id,
				eventType: event.type,
				processingTime: `${processingTime.toFixed(2)}ms`,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			const processingTime = performance.now() - requestStart
			
			this.logger.error(`❌ [${requestId}] Webhook processing failed after ${processingTime.toFixed(2)}ms:`, {
				error: {
					message: error instanceof Error ? error.message : 'Unknown error',
					name: error instanceof Error ? error.name : 'Unknown',
					stack: error instanceof Error ? error.stack : undefined
				},
				event: {
					eventType: req.stripeEvent?.type || 'unknown',
					eventId: req.stripeEvent?.id || 'unknown'
				},
				request: {
					method: req.method,
					url: req.url,
					hasRawBody: !!req.rawBody,
					bodyLength: req.rawBody?.length || 0
				},
				processingTime: `${processingTime.toFixed(2)}ms`,
				timestamp: new Date().toISOString()
			})
			
			throw new HttpException(
				{
					error: 'Webhook processing failed',
					eventType: req.stripeEvent?.type,
					eventId: req.stripeEvent?.id,
					requestId: requestId,
					processingTime: `${processingTime.toFixed(2)}ms`,
					timestamp: new Date().toISOString()
				},
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
