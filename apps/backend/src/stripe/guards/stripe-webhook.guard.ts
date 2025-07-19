import {
	Injectable,
	CanActivate,
	ExecutionContext,
	Logger,
	BadRequestException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeWebhookGuard implements CanActivate {
	private readonly logger = new Logger(StripeWebhookGuard.name)

	constructor(private configService: ConfigService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const signature = request.headers['stripe-signature']
		const webhookSecret = this.configService.get<string>(
			'STRIPE_WEBHOOK_SECRET'
		)

		if (!webhookSecret) {
			this.logger.error('Missing STRIPE_WEBHOOK_SECRET')
			return false
		}

		if (!signature) {
			this.logger.error('Missing stripe-signature header')
			return false
		}

		try {
			// Get raw body from the Fastify request payload
			let rawBody: Buffer | string

			// In Fastify, we can access the raw payload if the body isn't parsed yet
			// For webhook routes, we need to prevent JSON parsing and get raw body
			if (Buffer.isBuffer(request.body)) {
				// Body is already a buffer (ideal for webhooks)
				rawBody = request.body
				this.logger.debug('Using Buffer body')
			} else if (typeof request.body === 'string') {
				// Body is a string
				rawBody = request.body
				this.logger.debug('Using string body')
			} else if (request.body && typeof request.body === 'object') {
				// Body was parsed as JSON, convert back (not ideal but should work)
				rawBody = JSON.stringify(request.body)
				this.logger.debug('Using stringified JSON body')
				this.logger.debug('Original body:', request.body)
			} else {
				this.logger.error(
					'Unable to get raw body for webhook verification'
				)
				this.logger.error('Request body type:', typeof request.body)
				this.logger.error('Request body:', request.body)
				return false
			}

			// Construct and verify the webhook event
			const secretKey =
				this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				this.logger.error('Missing STRIPE_SECRET_KEY')
				return false
			}

			const stripe = new Stripe(secretKey, {
				apiVersion: '2025-06-30.basil'
			})

			const event = stripe.webhooks.constructEvent(
				rawBody,
				signature,
				webhookSecret
			)

			// Attach the verified event to the request for use in the controller
			request.stripeEvent = event

			return true
		} catch (err) {
			let message = 'Unknown webhook error'
			// The stripe-node library throws specific error types. We can check for them.
			if (err instanceof Stripe.errors.StripeError) {
				message = `Stripe webhook error: ${err.message}`
				this.logger.error(message, err.stack)
			}
			throw new BadRequestException(message)
		}
	}
}
