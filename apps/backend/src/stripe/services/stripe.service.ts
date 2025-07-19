import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
	private readonly stripe: Stripe

	constructor(private configService: ConfigService) {
		const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
		if (!secretKey) {
			throw new Error('STRIPE_SECRET_KEY is required')
		}

		this.stripe = new Stripe(secretKey, {
			apiVersion: '2025-06-30.basil'
		})
	}

	getStripeInstance(): Stripe {
		return this.stripe
	}

	getSecretKey(): string {
		return this.configService.get<string>('STRIPE_SECRET_KEY')!
	}

	getWebhookSecret(): string {
		return this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!
	}

	getPriceId(planId: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'): string {
		const priceIdMap = {
			FREE: this.configService.get<string>('STRIPE_FREE_PRICE_ID'),
			STARTER: this.configService.get<string>('STRIPE_STARTER_PRICE_ID'),
			GROWTH: this.configService.get<string>('STRIPE_GROWTH_PRICE_ID'),
			ENTERPRISE: this.configService.get<string>('STRIPE_ENTERPRISE_PRICE_ID')
		}

		const priceId = priceIdMap[planId]
		if (!priceId) {
			throw new Error(`Price ID not found for plan: ${planId}`)
		}
		return priceId
	}

	async createCustomer(params: {
		email: string
		name?: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Customer> {
		return await this.stripe.customers.create(params)
	}

	async updateCustomer(customerId: string, params: {
		email?: string
		name?: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Customer> {
		return await this.stripe.customers.update(customerId, params)
	}

	async createSubscription(params: {
		customer: string
		items: { price: string; quantity?: number }[]
		trial_period_days?: number
		metadata?: Record<string, string>
	}): Promise<Stripe.Subscription> {
		return await this.stripe.subscriptions.create(params)
	}

	async updateSubscription(subscriptionId: string, params: {
		items?: { id?: string; price?: string; quantity?: number }[]
		cancel_at_period_end?: boolean
		metadata?: Record<string, string>
	}): Promise<Stripe.Subscription> {
		return await this.stripe.subscriptions.update(subscriptionId, params)
	}

	async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
		return await this.stripe.subscriptions.cancel(subscriptionId)
	}

	async createCheckoutSession(params: {
		customerId: string
		priceId: string
		successUrl: string
		cancelUrl: string
		metadata?: Record<string, string>
	}): Promise<Stripe.Checkout.Session> {
		return this.stripe.checkout.sessions.create({
			customer: params.customerId,
			line_items: [{ price: params.priceId, quantity: 1 }],
			mode: 'subscription',
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			metadata: params.metadata
		})
	}

	async createPortalSession(params: {
		customer: string
		return_url?: string
	}): Promise<Stripe.BillingPortal.Session> {
		return await this.stripe.billingPortal.sessions.create(params)
	}

	constructWebhookEvent(payload: string | Buffer, signature: string, endpointSecret: string): Stripe.Event {
		return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret)
	}

	async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
		const paymentMethods = await this.stripe.paymentMethods.list({
			customer: customerId,
			type: 'card'
		})
		return paymentMethods.data
	}
}
