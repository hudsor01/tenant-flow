import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name)
	private _stripe: Stripe | null = null

	constructor(private readonly configService: ConfigService) {
		this.logger.log('StripeService constructor called')
	}

	private get stripe(): Stripe {
		if (!this._stripe) {
			const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				throw new Error('Missing STRIPE_SECRET_KEY configuration')
			}

			this._stripe = new Stripe(secretKey, {
				apiVersion: '2024-11-20.acacia', // Use stable API version
				typescript: true
			})

			this.logger.log('Stripe SDK initialized')
		}
		return this._stripe
	}

	get client(): Stripe {
		return this.stripe
	}

	// Basic Stripe operations following official patterns
	async createCustomer(params: {
		email: string
		name?: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Customer> {
		return await this.stripe.customers.create({
			email: params.email,
			name: params.name,
			metadata: params.metadata
		})
	}

	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		try {
			const customer = await this.stripe.customers.retrieve(customerId)
			if (customer.deleted) {
				return null
			}
			return customer as Stripe.Customer
		} catch (error: unknown) {
			const stripeError = error as Stripe.StripeRawError
			if (stripeError?.type === 'invalid_request_error' && stripeError?.code === 'resource_missing') {
				return null
			}
			throw error
		}
	}

	async createCheckoutSession(params: {
		customerId?: string
		customerEmail?: string
		priceId?: string
		mode: 'payment' | 'setup' | 'subscription'
		successUrl: string
		cancelUrl: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Checkout.Session> {
		const sessionParams: Stripe.Checkout.SessionCreateParams = {
			mode: params.mode,
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			metadata: params.metadata
		}

		if (params.customerId) {
			sessionParams.customer = params.customerId
		} else if (params.customerEmail) {
			sessionParams.customer_email = params.customerEmail
		}

		if (params.priceId) {
			sessionParams.line_items = [
				{
					price: params.priceId,
					quantity: 1
				}
			]
		}

		return await this.stripe.checkout.sessions.create(sessionParams)
	}

	async constructWebhookEvent(
		payload: string | Buffer,
		signature: string,
		endpointSecret: string
	): Promise<Stripe.Event> {
		return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret)
	}
}